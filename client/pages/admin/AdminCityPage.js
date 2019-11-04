//Modules
import _ from "lodash";
import React from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { Formik, Form } from "formik";
import * as Yup from "yup";

//Components
import BasicForm from "../../components/admin/BasicForm";
import NotFoundPage from "../NotFoundPage";
import LoadingPage from "../../components/LoadingPage";
import DeleteButtons from "../../components/admin/fields/DeleteButtons";
import HelmetBuilder from "~/client/components/HelmetBuilder";

//Constants
import * as fieldTypes from "~/constants/formFieldTypes";

//Actions
import {
	fetchCountries,
	fetchCities,
	createCity,
	updateCity,
	deleteCity
} from "~/client/actions/locationActions";

//Helpers
import { validateSlug } from "~/helpers/adminHelper";

class AdminCityPage extends BasicForm {
	constructor(props) {
		super(props);

		const { countries, fetchCountries, cities, fetchCities } = props;

		if (!countries) {
			fetchCountries();
		}

		if (!cities) {
			fetchCities();
		}

		this.state = {};
	}

	static getDerivedStateFromProps(nextProps) {
		const { countries, cities, match } = nextProps;
		const newState = { isLoading: false };

		//Create or Edit
		newState.isNew = !match.params.slug;

		//Check Everything is loaded
		if (!countries || (!newState.isNew && !cities)) {
			newState.isLoading = true;
			return newState;
		}

		//Create Validation Schema
		const rawValidationSchema = {
			name: Yup.string()
				.required()
				.label("Name"),
			_country: Yup.mixed()
				.required()
				.label("Country")
		};
		if (match.params.slug) {
			rawValidationSchema.slug = validateSlug();
		}

		newState.validationSchema = Yup.object().shape(rawValidationSchema);

		//Get Current City
		if (!newState.isNew) {
			newState.city = _.find(cities, ({ slug }) => slug == match.params.slug) || false;
		}

		//Get Country Options
		newState.countries = _.sortBy(
			countries.map(c => ({ label: c.name, value: c._id })),
			"label"
		);

		return newState;
	}

	getDefaults() {
		const { city, countries, isNew } = this.state;

		if (isNew) {
			return {
				name: "",
				country: ""
			};
		} else {
			return {
				name: city.name,
				_country: countries.find(c => c.value == city._country._id),
				slug: city.slug
			};
		}
	}

	async handleSubmit(fValues) {
		const { createCity, updateCity, history } = this.props;
		const { city, isNew } = this.state;

		const values = _.cloneDeep(fValues);
		values._country = values._country.value;

		let newSlug;
		if (isNew) {
			newSlug = await createCity(values);
			history.replace(`/admin/cities/${newSlug}`);
		} else {
			newSlug = await updateCity(city._id, values);
			history.push(`/admin/cities/${newSlug}`);
		}
	}

	async handleDelete() {
		const { deleteCity, history } = this.props;
		const { city } = this.state;
		const success = await deleteCity(city._id);
		if (success) {
			history.replace(`/admin/cities/`);
		}
	}

	renderDeleteButtons() {
		if (!this.state.isNew) {
			return (
				<div className="form-card">
					<DeleteButtons onDelete={() => this.handleDelete()} />
				</div>
			);
		}
	}

	render() {
		const { city, countries, isNew, isLoading, validationSchema } = this.state;

		if (isLoading) {
			return <LoadingPage />;
		}
		if (!isNew && city === false) {
			return <NotFoundPage message="Country not found" />;
		}

		const title = isNew ? "Add New City" : city.name;
		return (
			<div className="admin-city-page">
				<HelmetBuilder title={title} />
				<section className="page-header">
					<div className="container">
						<h1>{title}</h1>
					</div>
				</section>
				<section className="form">
					<div className="container">
						<Formik
							onSubmit={values => this.handleSubmit(values)}
							initialValues={this.getDefaults()}
							validationSchema={validationSchema}
							render={() => {
								const fields = [
									{ name: "name", type: fieldTypes.text },
									{
										name: "_country",
										type: fieldTypes.select,
										options: countries
									}
								];
								if (!isNew) {
									fields.push({ name: "slug", type: fieldTypes.text });
								}

								return (
									<Form>
										<div className="card form-card grid">
											{this.renderFieldGroup(fields)}
											<div className="buttons">
												<button type="reset">Reset</button>
												<button type="submit">
													{isNew ? "Add" : "Update"} City
												</button>
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

function mapStateToProps({ locations }) {
	const { countries, cities } = locations;
	return { countries, cities };
}

export default withRouter(
	connect(
		mapStateToProps,
		{ fetchCountries, fetchCities, createCity, updateCity, deleteCity }
	)(AdminCityPage)
);
