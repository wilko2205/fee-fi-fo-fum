//Mongoose
import _ from "lodash";
import mongoose from "mongoose";
const collectionName = "newsPosts";
const NewsPost = mongoose.model(collectionName);
const SlugRedirect = mongoose.model("slugRedirect");

//Helpers
import { getListsAndSlugs } from "./genericController";
import { getDirectoryList, uploadImageToGoogle } from "~/helpers/fileHelper";

//Config
function generateQuery(user, obj = {}) {
	const query = user ? {} : { isPublished: true };
	return {
		...query,
		...obj
	};
}

//Return updated post
async function getUpdatedPost(_id, res) {
	//Get Full Game
	const post = await NewsPost.find({ _id }).fullPost();
	const fullPosts = _.keyBy(post, "_id");

	//Get Game For List
	const list = await processList();

	res.send({ _id, fullPosts, ...list });
}

//Process List
async function processList(req = null) {
	const query = req ? generateQuery(req.user) : {};
	const posts = await NewsPost.find(query).forList();

	const { list, slugMap } = await getListsAndSlugs(posts, collectionName);
	return { postList: list, slugMap };
}

//Get basic list of posts
export async function getPostList(req, res) {
	const list = await processList(req);
	res.send(list);
}

//Get full post
export async function getFullPost(req, res) {
	const { id } = req.params;
	const query = generateQuery(req.user, { _id: id });
	const newsPost = await NewsPost.findOne(query, {
		contentHistory: false,
		version: false
	}).populate({
		path: "_author",
		select: "name frontendName twitter image"
	});

	if (newsPost) {
		res.send(newsPost);
	} else {
		res.status(404).send("Post not found");
	}
}

//Get Legacy Post
export async function getLegacyPost(req, res) {
	const { id } = req.params;
	const redir = await SlugRedirect.findOne({ collectionName, oldSlug: id }).lean();
	if (redir) {
		const post = await NewsPost.findById(redir.itemId, "slug");
		res.send(post);
	} else {
		res.status(404).send({});
	}
}

//Create Post
export async function createPost(req, res) {
	const values = _.mapValues(req.body, v => (v == "" ? null : v));
	const post = new NewsPost(values);
	await post.save();

	await getUpdatedPost(post._id, res);
}

//Update Post
export async function updatePost(req, res) {
	const { _id } = req.params;
	const newsPost = await NewsPost.findById(_id);
	if (!newsPost) {
		res.status(404).send(`No post found with id ${_id}`);
		return false;
	} else {
		const values = _.mapValues(req.body, v => (v == "" ? null : v));
		values.dateModified = new Date();
		await newsPost.updateOne(values);

		await getUpdatedPost(_id, res);
	}
}

//Get All Header Images
export async function getHeaderImages(req, res) {
	const imageList = await getDirectoryList("images/news/headers/");

	res.send(imageList);
}

//Upload Header Image
export async function uploadHeaderImage(req, res) {
	const { _id } = req.params;
	const newsPost = await NewsPost.findById(_id);
	if (!newsPost) {
		res.status(404).send(`No post found with id ${_id}`);
		return false;
	} else {
		const fileSizeLimit = 5;

		if (req.file.size / 1024 / 1024 > fileSizeLimit) {
			res.status(413).send(`Image must be less than ${fileSizeLimit}mb`);
		} else {
			//Update originalname for blob
			req.file.originalname = req.body.name;

			//Upload
			const { name } = await uploadImageToGoogle(
				req.file,
				"images/news/headers/",
				true,
				`${newsPost.slug}-${new Date().getTime()}`
			);

			//Update model
			await newsPost.updateOne({ image: name });

			//Return
			await getUpdatedPost(_id, res);
		}
	}
}

//Delete Header Image
export async function deleteHeaderImage(req, res) {
	const { _id } = req.params;
	const newsPost = await NewsPost.findById(_id);
	if (!newsPost) {
		res.status(404).send(`No post found with id ${_id}`);
		return false;
	} else {
		await newsPost.updateOne({ image: null });

		await getUpdatedPost(_id, res);
	}
}

//Upload Inline Image
export async function uploadInlineImage(req, res) {
	const fileSizeLimit = 5;
	if (req.file.size / 1024 / 1024 > fileSizeLimit) {
		res.status(413).send(`Image must be less than ${fileSizeLimit}mb`);
	} else {
		const { externalUrl } = await uploadImageToGoogle(
			req.file,
			"images/news/inline/",
			false,
			req.body.name
		);
		res.send(externalUrl);
	}
}

//Create Post
export async function deletePost(req, res) {
	const { _id } = req.params;
	const newsPost = await NewsPost.findById(_id);
	if (!newsPost) {
		res.status(404).send(`No post found with id ${_id}`);
		return false;
	} else {
		await NewsPost.findByIdAndRemove(_id);
		res.send(_id);
	}
}
