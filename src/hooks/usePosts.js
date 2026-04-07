// hooks/usePosts.js — المنشورات والقصص مع Firestore

import { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  where,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { uploadMedia } from "../lib/cloudinary";

// ─── Posts ────────────────────────────────────────────────────
export function usePosts() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const createPost = async ({ text, mediaFile, authorId, authorName, authorAvatar, verified }) => {
    let mediaUrl = null;
    let mediaType = null;

    if (mediaFile) {
      const res = await uploadMedia(mediaFile, "orbit/posts");
      mediaUrl = res.url;
      mediaType = mediaFile.type.startsWith("video") ? "video" : "image";
    }

    await addDoc(collection(db, "posts"), {
      text,
      mediaUrl,
      mediaType,
      authorId,
      authorName,
      authorAvatar: authorAvatar || null,
      verified: verified || false,
      likes: [],
      comments: [],
      shares: 0,
      createdAt: serverTimestamp(),
    });
  };

  const toggleLike = async (postId, uid) => {
    const postRef = doc(db, "posts", postId);
    const post = posts.find((p) => p.id === postId);
    const liked = post?.likes?.includes(uid);
    await updateDoc(postRef, {
      likes: liked ? arrayRemove(uid) : arrayUnion(uid),
    });
  };

  const deletePost = async (postId) => {
    await deleteDoc(doc(db, "posts", postId));
  };

  return { posts, loading, createPost, toggleLike, deletePost };
}

// ─── Stories (24h) ───────────────────────────────────────────
export function useStories() {
  const [stories, setStories] = useState([]);

  useEffect(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 ساعة
    const q = query(
      collection(db, "stories"),
      where("createdAt", ">", new Date(cutoff)),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setStories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const addStory = async ({ mediaFile, authorId, authorName, authorAvatar, verified }) => {
    const res = await uploadMedia(mediaFile, "orbit/stories");
    await addDoc(collection(db, "stories"), {
      mediaUrl: res.url,
      mediaType: mediaFile.type.startsWith("video") ? "video" : "image",
      authorId,
      authorName,
      authorAvatar: authorAvatar || null,
      verified: verified || false,
      views: [],
      createdAt: serverTimestamp(),
    });
  };

  return { stories, addStory };
}

// ─── Comments ────────────────────────────────────────────────
export function useComments(postId) {
  const [comments, setComments] = useState([]);

  useEffect(() => {
    if (!postId) return;
    const q = query(
      collection(db, "posts", postId, "comments"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [postId]);

  const addComment = async ({ postId, text, authorId, authorName, verified }) => {
    await addDoc(collection(db, "posts", postId, "comments"), {
      text,
      authorId,
      authorName,
      verified: verified || false,
      likes: [],
      createdAt: serverTimestamp(),
    });
    // زيادة عداد التعليقات في المنشور
    await updateDoc(doc(db, "posts", postId), {
      commentCount: (comments.length + 1),
    });
  };

  return { comments, addComment };
}
