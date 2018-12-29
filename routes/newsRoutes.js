const mongoose = require("mongoose");
const collectionName = "newsPosts";

//Controllers
const NewsPostController = require("../controllers/newsPostController");

module.exports = app => {
	app.get("/api/news/pagination/:category", NewsPostController.getPagination);

	app.get("/api/news/posts/:category/:page", NewsPostController.getPostList);

	app.get("/api/news/categories", NewsPostController.getCategoryList);

	app.get("/api/news/slug/:slug", NewsPostController.getPostBySlug);

	app.get("/api/news/sidebarPosts", NewsPostController.getSidebarPosts);
};