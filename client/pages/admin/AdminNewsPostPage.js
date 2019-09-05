//Modules
import _ from "lodash";
import React from "react";
import { connect } from "react-redux";
import { Link, Redirect } from "react-router-dom";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { createEditorState } from "medium-draft";
import { convertToRaw } from "draft-js";

//Components
import BasicForm from "../../components/admin/BasicForm";
import LoadingPage from "../../components/LoadingPage";
import HelmetBuilder from "../../components/HelmetBuilder";
import NotFoundPage from "~/client/pages/NotFoundPage";
import DeleteButtons from "~/client/components/admin/fields/DeleteButtons";
import NewsPostEditor from "../../components/news/NewsPostEditor";

//Actions
import {
	fetchPostList,
	fetchNewsPost,
	createNewsPost,
	updateNewsPost,
	deleteNewsPost
} from "~/client/actions/newsActions";
import { fetchUserList } from "~/client/actions/userActions";
import { fetchGameList } from "~/client/actions/gamesActions";

//Constants
import newsCategories from "~/constants/newsCategories";

//Helpers
import { convertToEditorState } from "~/helpers/newsHelper";
import { validateSlug } from "~/helpers/adminHelper";

class AdminNewsPostPage extends BasicForm {
	constructor(props) {
		super(props);

		const {
			postList,
			fetchPostList,
			userList,
			fetchUserList,
			gameList,
			fetchGameList
		} = props;

		if (!postList) {
			fetchPostList();
		}

		if (!gameList) {
			fetchGameList();
		}

		if (!userList) {
			fetchUserList();
		}

		const validationSchema = Yup.object().shape({
			title: Yup.string()
				.required()
				.label("Title"),
			_author: Yup.mixed()
				.required()
				.label("Author"),
			subtitle: Yup.string().label("Sub-title"),
			category: Yup.mixed()
				.required()
				.label("Category"),
			slug: validateSlug(),
			image: Yup.string()
				.required()
				.label("Header Image"),
			dateCreated: Yup.date().label("Date Created"),
			timeCreated: Yup.string().label("Time Created"),
			isPublished: Yup.boolean().label("Published?")
		});

		this.state = { validationSchema };
	}

	static getDerivedStateFromProps(nextProps, prevState) {
		const {
			fullPosts,
			match,
			slugMap,
			fetchNewsPost,
			userList,
			gameList
		} = nextProps;
		const { slug } = match.params;
		const newState = {};

		//Is New
		newState.isNew = !slug;

		//Handle Redirect
		if (prevState.redirect == nextProps.location.pathname) {
			newState.redirect = undefined;
		}

		//Check we have the info we need
		if (!slugMap || !userList || !gameList) {
			return newState;
		}

		//Get Post
		if (!newState.isNew) {
			if (!slugMap[slug]) {
				newState.post = false;
			} else if (slugMap[slug].redirect) {
				//TODO
				return {};
			} else if (slugMap) {
				const id = slugMap[slug].id;
				const post = fullPosts[id];
				if (!post && !prevState.isLoading) {
					fetchNewsPost(id);
					newState.isLoading = true;
				} else if (post) {
					newState.post = post;
					newState.isLoading = false;
				}
			}
		}

		//Get Users
		newState.users = _.chain(userList)
			.map(user => ({ label: user.name.full, value: user._id }))
			.sortBy("label")
			.value();

		//Get Categories
		newState.categories = _.chain(newsCategories)
			.map(({ name, slug }) => ({ value: slug, label: name }))
			.sortBy("label")
			.value();

		return newState;
	}

	getDefaults() {
		const { authUser } = this.props;
		const { isNew, post, users, categories } = this.state;
		if (isNew) {
			return {
				title: "",
				_author: users.find(({ value }) => value == authUser._id) || "",
				subtitle: "",
				category: "",
				slug: "",
				image: "",
				content: createEditorState()
			};
		} else {
			const { title, subtitle, dateCreated, isPublished, slug } = post;
			return {
				title,
				_author: users.find(({ value }) => value == post._author._id) || "",
				subtitle: subtitle || "",
				slug,
				image: post.image || "",
				dateCreated: dateCreated.toString("yyyy-MM-dd"),
				timeCreated: dateCreated.toString("HH:mm:ss"),
				isPublished,
				category: categories.find(({ value }) => value == post.category) || "",
				content: convertToEditorState(post.content)
			};
		}
	}

	async handleSubmit(fValues) {
		const { createNewsPost, updateNewsPost } = this.props;
		const { post } = this.state;

		//Create Values
		const values = _.cloneDeep(fValues);
		values._author = values._author.value;
		values.category = values.category.value;
		values.content = JSON.stringify(convertToRaw(values.content.getCurrentContent()));

		if (post) {
			values.dateCreated = new Date(`${values.dateCreated} ${values.timeCreated}`);
			delete values.timeCreated;
			await updateNewsPost(post._id, values);
		} else {
			const slug = await createNewsPost(values);
			this.setState({ redirect: `/admin/news/post/${slug}` });
		}
	}

	async handleDelete() {
		const { deleteNewsPost } = this.props;
		const { post } = this.state;
		await deleteNewsPost(post._id);
		this.setState({ redirect: "/admin/news/" });
	}

	renderViewLink() {
		const { post } = this.state;
		if (post && post.isPublished) {
			return (
				<Link className="card nav-card" to={`/news/post/${post.slug}`}>
					View this post
				</Link>
			);
		} else {
			return null;
		}
	}

	renderDeleteButtons() {
		const { isNew } = this.state;
		if (!isNew) {
			return (
				<div className="form-card">
					<DeleteButtons onDelete={() => this.handleDelete()} />
				</div>
			);
		}
	}

	renderContentEditor(formikProps) {
		const { isNew } = this.state;
		if (!isNew) {
			return (
				<div className="form-card">
					<NewsPostEditor
						editorState={formikProps.values.content}
						onChange={c => formikProps.setFieldValue("content", c)}
					/>
				</div>
			);
		}
	}

	render() {
		const {
			post,
			isNew,
			users,
			categories,
			isLoading,
			redirect,
			validationSchema
		} = this.state;
		if (redirect) {
			return <Redirect to={redirect} />;
		}

		if (post === false && !isNew) {
			return <NotFoundPage error={"Game not found"} />;
		}

		if (isLoading || (post === undefined && !isNew) || !users || !categories) {
			return <LoadingPage />;
		}

		const title = isNew ? "New Post" : post.title;
		let dateModifiedString = "-";
		if (post && post.dateModified) {
			dateModifiedString = post.dateModified.toString("HH:mm:ss dd/MM/yyyy");
		}
		return (
			<div>
				<HelmetBuilder title={title} />
				<section className="page-header">
					<div className="container">
						<Link className="nav-card card" to="/admin/news">
							↩ Return to post list
						</Link>
						{this.renderViewLink()}
						<h1>{title}</h1>
					</div>
				</section>
				<section>
					<div className="container">
						<Formik
							initialValues={this.getDefaults()}
							validationSchema={validationSchema}
							onSubmit={values => this.handleSubmit(values)}
							render={formikProps => {
								const mainFields = [
									{ name: "title", type: "text" },
									{ name: "subtitle", type: "text" },
									{ name: "_author", type: "Select", options: users },
									{ name: "category", type: "Select", options: categories },
									{ name: "slug", type: "text" }
								];
								if (!isNew) {
									mainFields.push(
										{ name: "isPublished", type: "Boolean" },
										{ name: "dateCreated", type: "date" },
										{ name: "timeCreated", type: "time" }
									);
								}
								return (
									<Form>
										<div className="form-card no-labels">
											{this.renderFieldGroup([
												{
													name: "image",
													type: "Image",
													path: "images/news/headers/",
													acceptSVG: false,
													defaultUploadName:
														formikProps.values.slug || null
												}
											])}
										</div>
										<div className="form-card grid">
											{this.renderFieldGroup(mainFields)}
											<label>Last Modified</label>
											<input disabled value={dateModifiedString} />
										</div>
										{this.renderContentEditor(formikProps)}
										<div className="form-card">
											<div className="buttons">
												<button type="reset">Reset</button>
												<button type="submit">Save Post</button>
											</div>
										</div>
										{this.renderDeleteButtons()}
									</Form>
								);
							}}
						/>
					</div>
				</section>
			</div>
		);
	}
}

function mapStateToProps({ config, games, news, users }) {
	const { authUser } = config;
	const { postList, slugMap, fullPosts } = news;
	const { userList } = users;
	const { gameList } = games;
	return { authUser, postList, slugMap, fullPosts, userList, gameList };
}

export default connect(
	mapStateToProps,
	{
		fetchPostList,
		fetchNewsPost,
		fetchUserList,
		fetchGameList,
		createNewsPost,
		updateNewsPost,
		deleteNewsPost
	}
)(AdminNewsPostPage);