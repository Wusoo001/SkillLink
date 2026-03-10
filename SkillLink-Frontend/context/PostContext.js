import React, { createContext, useState } from "react";

export const PostContext = createContext();

export const PostProvider = ({ children }) => {
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [newPost, setNewPost] = useState(null); // new optimistic post

  const triggerRefresh = () => setRefreshFlag(prev => !prev);

  const addNewPost = (post) => {
    setNewPost(post);
    triggerRefresh();
  };

  const clearNewPost = () => setNewPost(null);

  return (
    <PostContext.Provider value={{ refreshFlag, triggerRefresh, newPost, addNewPost, clearNewPost }}>
      {children}
    </PostContext.Provider>
  );
};