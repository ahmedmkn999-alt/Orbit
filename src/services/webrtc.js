// WebRTC Service for Video/Audio Calls
import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  onSnapshot, 
  updateDoc,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';

class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Add TURN servers for better connectivity
        {
          urls: 'turn:numb.viagenie.ca',
          username: 'webrtc@live.com',
          credential: 'muazkh'
        }
      ]
    };
    this.callId = null;
    this.isInitiator = false;
  }

  // Initialize local media stream
  async getLocalStream(isVideoCall = true) {
    try {
      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: isVideoCall ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  // Initialize peer connection
  initializePeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.configuration);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    }

    // Handle remote stream
    this.remoteStream = new MediaStream();
    this.peerConnection.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream.addTrack(track);
      });
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate && this.callId) {
        const candidateCollection = this.isInitiator 
          ? `calls/${this.callId}/callerCandidates`
          : `calls/${this.callId}/calleeCandidates`;
        
        await setDoc(doc(db, candidateCollection, `${Date.now()}`), {
          candidate: event.candidate.toJSON()
        });
      }
    };

    // Connection state monitoring
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection.connectionState);
      if (this.peerConnection.connectionState === 'failed') {
        this.handleConnectionFailure();
      }
    };

    return this.peerConnection;
  }

  // Start a call (initiator)
  async startCall(calleeId, isVideoCall = true) {
    try {
      this.isInitiator = true;
      this.callId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Get local stream
      await this.getLocalStream(isVideoCall);
      
      // Initialize peer connection
      this.initializePeerConnection();

      // Create offer
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: isVideoCall
      });
      await this.peerConnection.setLocalDescription(offer);

      // Save call data to Firestore
      const callDoc = {
        callerId: auth.currentUser.uid,
        calleeId: calleeId,
        offer: {
          type: offer.type,
          sdp: offer.sdp
        },
        status: 'ringing',
        isVideoCall: isVideoCall,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'calls', this.callId), callDoc);

      // Listen for answer
      this.listenForAnswer();
      
      // Listen for remote ICE candidates
      this.listenForRemoteCandidates(false);

      return { success: true, callId: this.callId };
    } catch (error) {
      console.error('Error starting call:', error);
      return { success: false, error: error.message };
    }
  }

  // Answer a call (receiver)
  async answerCall(callId) {
    try {
      this.isInitiator = false;
      this.callId = callId;

      // Get call data
      const callDoc = await getDoc(doc(db, 'calls', callId));
      if (!callDoc.exists()) {
        throw new Error('Call not found');
      }

      const callData = callDoc.data();
      
      // Get local stream
      await this.getLocalStream(callData.isVideoCall);
      
      // Initialize peer connection
      this.initializePeerConnection();

      // Set remote description from offer
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(callData.offer)
      );

      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // Update call with answer
      await updateDoc(doc(db, 'calls', callId), {
        answer: {
          type: answer.type,
          sdp: answer.sdp
        },
        status: 'connected'
      });

      // Listen for remote ICE candidates
      this.listenForRemoteCandidates(true);

      return { success: true };
    } catch (error) {
      console.error('Error answering call:', error);
      return { success: false, error: error.message };
    }
  }

  // Listen for answer (initiator)
  listenForAnswer() {
    const unsubscribe = onSnapshot(doc(db, 'calls', this.callId), async (snapshot) => {
      const data = snapshot.data();
      if (data && data.answer && !this.peerConnection.currentRemoteDescription) {
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      }
    });
    return unsubscribe;
  }

  // Listen for remote ICE candidates
  listenForRemoteCandidates(isInitiator) {
    const candidateCollection = isInitiator 
      ? `calls/${this.callId}/callerCandidates`
      : `calls/${this.callId}/calleeCandidates`;

    const unsubscribe = onSnapshot(
      collection(db, candidateCollection),
      (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data().candidate);
            await this.peerConnection.addIceCandidate(candidate);
          }
        });
      }
    );
    return unsubscribe;
  }

  // Mute/Unmute audio
  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }

  // Turn video on/off
  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  // Switch camera (front/back)
  async switchCamera() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        const currentFacingMode = videoTrack.getSettings().facingMode;
        const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
        
        videoTrack.stop();
        
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newFacingMode }
        });
        
        const newVideoTrack = newStream.getVideoTracks()[0];
        const sender = this.peerConnection.getSenders().find(s => s.track.kind === 'video');
        
        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
        
        this.localStream.removeTrack(videoTrack);
        this.localStream.addTrack(newVideoTrack);
        
        return true;
      }
    }
    return false;
  }

  // End call
  async endCall() {
    try {
      // Stop all tracks
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
      }
      if (this.remoteStream) {
        this.remoteStream.getTracks().forEach(track => track.stop());
      }

      // Close peer connection
      if (this.peerConnection) {
        this.peerConnection.close();
      }

      // Update call status
      if (this.callId) {
        await updateDoc(doc(db, 'calls', this.callId), {
          status: 'ended',
          endedAt: serverTimestamp()
        });
      }

      // Reset state
      this.peerConnection = null;
      this.localStream = null;
      this.remoteStream = null;
      this.callId = null;

      return { success: true };
    } catch (error) {
      console.error('Error ending call:', error);
      return { success: false, error: error.message };
    }
  }

  // Reject incoming call
  async rejectCall(callId) {
    try {
      await updateDoc(doc(db, 'calls', callId), {
        status: 'rejected',
        rejectedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error rejecting call:', error);
      return { success: false, error: error.message };
    }
  }

  // Handle connection failure
  handleConnectionFailure() {
    console.log('Connection failed, attempting to reconnect...');
    // Implement reconnection logic here
  }

  // Get call statistics
  async getCallStats() {
    if (this.peerConnection) {
      const stats = await this.peerConnection.getStats();
      return stats;
    }
    return null;
  }
}

export default new WebRTCService();
