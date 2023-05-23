import React from "react";
import { motion } from "framer-motion";
import { FaStar } from "react-icons/fa";
import { IoMdTrash } from "react-icons/io";
import "../assets/css/profile.css";
import { useParams } from "react-router-dom";
import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { GET_POSTS, GET_USER_BY_ID, GET_ME } from "../utils/queries";
import {
  CREATE_REVIEW,
  UPDATE_REVIEW,
  DELETE_REVIEW,
} from "../utils/mutations";
import { DELETE_POST } from "../utils/mutations";
import Auth from "../utils/auth";

function Profile() {
  const { loading: meLoading, data: meData } = useQuery(GET_ME);
  const loggedInUserData = meData?.me || [];
  const activeUserId = loggedInUserData._id;
  const activeUserName = loggedInUserData.userName;
  const { farmerId: farmerParam } = useParams();
  const { loading: postsLoading, data: postData } = useQuery(GET_POSTS);
  const { loading: userLoading, data: userData } = useQuery(GET_USER_BY_ID, {
    variables: { userId: farmerParam },
  });

  const [commentFormVisible, setCommentFormVisible] = useState({});
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [activePostId, setActivePostId] = useState("");
  const [activeReviewId, setActiveReviewId] = useState("");

  const handleRating = (selectedRating) => {
    setRating(selectedRating);
  };

  const [createReview] = useMutation(CREATE_REVIEW, {
    // Reftching GET_POSTS after deleting a post (need this so we don't need to refresh page)
    refetchQueries: [{ query: GET_POSTS }],
  });

  const handleCreateReview = async () => {
    const token = Auth.isLoggedIn() ? Auth.getToken() : null;
    if (!token) {
      return false;
    }

    try {
      const reviewInput = {
        userId: activeUserId,
        userName: activeUserName,
        postId: activePostId,
        text: reviewText,
        rate: rating,
      };

      const { data } = await createReview({
        variables: {
          input: reviewInput,
        },
      });
      console.log(data);
      setReviewText("");
      setRating(0);
      setCommentFormVisible({});
    } catch (error) {
      console.error(error);
    }
  };

  const [deleteReview] = useMutation(DELETE_REVIEW, {
    refetchQueries: [{ query: GET_POSTS }],
  });

  const handleDeleteReview = async (reviewId) => {
    try {
      const { data } = await deleteReview({
        variables: {
          reviewId: reviewId,
        },
      });
      console.log(data);
    } catch (error) {
      console.error(error);
    }
  };

  const [deletePost] = useMutation(DELETE_POST, {
    // Reftching GET_POSTS after deleting a post (need this so we don't need to refresh page)
    refetchQueries: [{ query: GET_POSTS }],
  });

  // Function to delete post
  const handleDeletePost = async (postId) => {
    const token = Auth.isLoggedIn() ? Auth.getToken() : null;
    if (!token) {
      return false;
    }
    try {
      await deletePost({
        variables: { postId },
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (postsLoading || userLoading || meLoading) {
    return <p>Loading...</p>;
  }

  if (userData.userById.role !== "Farmer") {
    return (
      <h3>
        Sorry, only Farmers can publish posts, the user selected is a Consumer
      </h3>
    );
  }

  // Filter all posts to only get the ones created by farmer that was selected
  const postsByFarmer = postData.allPosts.filter(
    (post) => post.userId === farmerParam
  );
  // If there are no posts returns the below
  if (postsByFarmer.length === 0) {
    return (
      <div className="profile-container">
        <div className="profile-header">
          <div className="profile-avatar"></div>
          <div className="profile-info">
            <h2 className="name">{userData.userById.businessName}</h2>
            <p className="location">
              {userData.userById.city}, {userData.userById.state}
            </p>
          </div>
        </div>
        <div className="description">{userData.userById.description}</div>
        <h3 className="posts-heading">
          This Farmer does not have any posts yet
        </h3>
      </div>
    );
  }

  // If there are posts by the selected farmer, show them on page
  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar"></div>
        <div className="profile-info">
          <h2 className="name">{userData.userById.businessName}</h2>
          <p className="location">
            {userData.userById.city}, {userData.userById.state}
          </p>
        </div>
      </div>
      <div className="description">{userData.userById.description}</div>
      <h3 className="posts-heading">Posts</h3>
      <div className="posts-container">
        {postsByFarmer.map((post, index) => (
          <motion.div
            className="post-card"
            key={post._id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: index * 0.2 }}
          >
            <div className="post-image"></div>
            <h4 className="post-title">{post.title}</h4>
            <p className="post-description">{post.description}</p>
            {activeUserId === post.userId && (
              <button
                className="delete-post-button"
                onClick={() => handleDeletePost(post._id)}
                // Show the delete button only to the post creator
              >
                <IoMdTrash />
              </button>
            )}
            <button
              className="add-comment-button"
              onClick={() => {
                setActivePostId(post._id);
                setCommentFormVisible((prevState) => ({
                  ...prevState,
                  [post._id]: !prevState[post._id],
                }));
              }}
            >
              Add Comment
            </button>
            {commentFormVisible[post._id] && (
              <div className="comment-form">
                <div className="rating">
                  Rate:
                  {Array.from({ length: 5 }, (_, index) => (
                    <FaStar
                      key={index}
                      value={rating}
                      className={`star-icon ${
                        rating >= index + 1 ? "filled" : ""
                      }`}
                      onClick={() => handleRating(index + 1)}
                    />
                  ))}
                </div>
                <textarea
                  className="comment-input"
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Enter your comment..."
                ></textarea>
                <button
                  className="submit-comment-button"
                  onClick={handleCreateReview}
                >
                  Submit Comment
                </button>
              </div>
            )}
            <div className="comments-section">
              <h5>Comments</h5>
              {post.reviews.map((review) => (
                <div className="comment-card" key={review._id}>
                  <div className="comment-content">
                    <p className="comment-text">{review.text}</p>
                    <p className="comment-author">- {review.userName}</p>
                  </div>
                  {activeUserId === review.userId && (
                    <button
                      className="add-comment-button"
                      onClick={() => handleDeleteReview(review._id)}
                    >
                      Delete Comment
                    </button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default Profile;
