//Modules
import React, { Component } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";

class ErrorPrintout extends Component {
	constructor(props) {
		super(props);

		this.state = { errorTapCount: 0 };
	}

	renderDate() {
		const { date } = this.props;
		if (date) {
			return <div className="date">{date.toLocaleString()}</div>;
		}
	}

	renderMessage() {
		const { componentStack, environment } = this.props;
		const { errorTapCount } = this.state;
		if (environment === "development" || errorTapCount >= 5) {
			return <pre>{componentStack}</pre>;
		}
	}

	render() {
		const { file, message } = this.props;
		const { errorTapCount } = this.state;

		return (
			<div className="error-boundary">
				<h2 onClick={() => this.setState({ errorTapCount: errorTapCount + 1 })}>Error</h2>
				<div className="data">
					<div className="message">
						{message} ({file})
					</div>
					{this.renderDate()}
				</div>
				{this.renderMessage()}
			</div>
		);
	}
}

ErrorPrintout.propTypes = {
	date: PropTypes.instanceOf(Date),
	file: PropTypes.string.isRequired,
	message: PropTypes.string.isRequired,
	componentStack: PropTypes.string.isRequired
};

function mapStateToProps({ config }) {
	const { environment } = config;
	return { environment };
}

export default connect(mapStateToProps)(ErrorPrintout);
