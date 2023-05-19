const { User, Review, Post } = require("../models");
const { AuthenticationError } = require("apollo-server-express");
const { signToken } = require("../utils/auth");
const stripe = require("stripe")(
  "sk_test_51N9BOWDpKmnLMg2OJUManAkWYJVsMJ8GPXH6NC6Iv3gGDoX49EnHLnTNy9pIyPNAQAHYROjB6OunybqaE5uVDNKO0019EaAf3A"
);

const resolvers = {
  Query: {
    users: async () => {
      return User.find();
    },
    userById: async (_, { userId }) => {
      return User.findOne({ _id: userId });
    },
  },
  Mutation: {
    createUser: async (_, { input }) => {
      const user = await User.create(input);
      // Create signin token
      const token = signToken(user);
      return { token, user };
    },

    updateUser: async (_, { userId, ...updateData }) => {
      return User.findOneAndUpdate({ _id: userId }, updateData, { new: true });
    },
    deleteUser: async (_, { userId }) => {
      return User.findOneAndDelete({ _id: userId });
    },
    createReview: async (parent, { reviewData }, context) => {
      if (context.user) {
        const newReview = await Review.create(reviewData);
        return newReview;
      }
      throw new AuthenticationError("Something went wrong!");
    },

    updateReview: async (parent, { reviewData }, context) => {
      if (context.user) {
        const updatedReview = await Review.findOneAndUpdate(
          { _id: reviewData.reviewId, user: context.user._id },
          reviewData,
          { new: true }
        );
        return updatedReview;
      }
      throw new AuthenticationError("Something went wrong!");
    },
    deleteReview: async (parent, { postId }, context) => {
      if (context.user) {
        const reviewToDelete = await Review.findOneAndDelete({
          postId,
          user: context.user._id,
        });
        return reviewToDelete;
      }
    },
    createPost: async (parent, { post }, context) => {
      const newPost = await User.findOneAndUpdate(
        { _id: context.user._id },
        { $addToSet: { post } },
        { new: true }
      );
      if (!newPost) {
        throw new AuthenticationError("Couldn't create new post!");
      }
      return newPost;
    },
    updatePost: async (parent, { id, post }) => {
      const updatedPost = await Post.findOneAndUpdate(
        { _id: id },
        { $set: post },
        { new: true }
      );
      if (!updatedPost) {
        throw new AuthenticationError("Couldn't update post!");
      }
      return updatedPost;
    },
    deletePost: async (parent, { postId }, context) => {
      const postDeleted = await User.findOneAndUpdate(
        { _id: context.user._id },
        { $pull: { post: { postId } } },
        { new: true }
      );
      if (!postDeleted) {
        throw new AuthenticationError("Couldn't delete post!");
      }
      return postDeleted;
    },
    login: async (parent, { email, password }) => {
      const user = await User.findOne({ email });
      if (!user) {
        throw new AuthenticationError("User not found");
      }
      const correctPassword = await user.verifyPassword(password);
      if (!correctPassword) {
        throw new AuthenticationError("Wrong password!");
      }
      // If password is correct, create signin token
      const token = signToken(user);
      return { token, user };
    },
    createPaymentIntent: async (parent, { amount }) => {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount * 100,
          currency: "usd",
        });
        console.log(paymentIntent);
        return paymentIntent;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
  },
};

module.exports = resolvers;
