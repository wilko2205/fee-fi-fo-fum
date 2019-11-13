//Modules
import _ from "lodash";
import React, { Component } from "react";
import { connect } from "react-redux";
import * as Yup from "yup";

//Components
import BasicForm from "../BasicForm";

//Actions
import {
	createCompetition,
	updateCompetition,
	deleteCompetition
} from "~/client/actions/competitionActions";

//Constants
const competitionTypes = require("~/constants/competitionTypes");
import * as fieldTypes from "~/constants/formFieldTypes";

class AdminCompetitionOverview extends Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	static getDerivedStateFromProps(nextProps) {
		const { competitionList, match } = nextProps;
		const newState = {};

		//Get Current Competition
		const { _id } = match.params;
		newState.isNew = !_id;
		if (!newState.isNew) {
			newState.competition = competitionList[_id];
		}

		//Dropdown options
		newState.options = {
			type: competitionTypes.sort().map(value => ({ value, label: value })),
			webcrawlFormat: [
				{ value: "RFL", label: "RFL" },
				{ value: "SL", label: "Super League" }
			]
		};

		//Create Validation Schema
		newState.validationSchema = Yup.object().shape({
			name: Yup.string()
				.required()
				.label("Name"),
			type: Yup.mixed()
				.required()
				.label("Type"),
			playerLimit: Yup.number().label("Max Players Per Game"),
			useAllSquads: Yup.boolean().label("Use All Squads"),
			webcrawlFormat: Yup.mixed().label("Web Crawl Format"),
			webcrawlUrl: Yup.string().label("Web Crawl Root URL")
		});

		return newState;
	}

	getInitialValues() {
		const { competition, isNew, options } = this.state;
		const defaultValues = {
			name: "",
			type: "",
			playerLimit: "",
			useAllSquads: false,
			webcrawlFormat: "",
			webcrawlUrl: ""
		};

		if (isNew) {
			return defaultValues;
		} else {
			return _.mapValues(defaultValues, (defaultValue, key) => {
				let value;
				switch (key) {
					case "type":
					case "webcrawlFormat":
						value = options[key].find(option => option.value === competition[key]);
						break;
					default:
						value = competition[key];
						break;
				}
				return value != null ? value : defaultValue;
			});
		}
	}

	getFieldGroups() {
		const { options } = this.state;
		return [
			{
				fields: [
					{ name: "name", type: fieldTypes.text },
					{
						name: "type",
						type: fieldTypes.select,
						options: options.type
					},
					{ name: "playerLimit", type: fieldTypes.number },
					{ name: "useAllSquads", type: fieldTypes.boolean },
					{
						name: "webcrawlFormat",
						type: fieldTypes.select,
						options: options.webcrawlFormat,
						isClearable: true,
						placeholder: "None"
					},
					{
						name: "webcrawlUrl",
						type: fieldTypes.text
					}
				]
			}
		];
	}

	render() {
		const { createCompetition, updateCompetition, deleteCompetition } = this.props;
		const { competition, isNew, validationSchema } = this.state;

		//Handle props specifically for create/update
		let formProps;
		if (isNew) {
			formProps = {
				onSubmit: values => createCompetition(values),
				redirectOnSubmit: id => `/admin/competitions/${id}`
			};
		} else {
			formProps = {
				onDelete: () => deleteCompetition(competition._id),
				onSubmit: values => updateCompetition(competition._id, values),
				redirectOnDelete: "/admin/competitions/"
			};
		}
		return (
			<section className="form">
				<div className="container">
					<BasicForm
						fieldGroups={this.getFieldGroups()}
						initialValues={this.getInitialValues()}
						isNew={isNew}
						itemType="Competition"
						validationSchema={validationSchema}
						{...formProps}
					/>
				</div>
			</section>
		);
	}
}

function mapStateToProps({ competitions }) {
	const { competitionList } = competitions;
	return { competitionList };
}

export default connect(mapStateToProps, {
	createCompetition,
	updateCompetition,
	deleteCompetition
})(AdminCompetitionOverview);
