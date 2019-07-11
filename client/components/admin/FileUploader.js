//Modules
import React, { Component } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";

//Components
import PopUpDialog from "../PopUpDialog";

//Actions
import { uploadFile } from "~/client/actions/fileActions";

class FileUploader extends Component {
	constructor(props) {
		super(props);
		this.inputRef = React.createRef();

		//Create State
		this.state = {};
	}

	onChange(ev) {
		const { defaultName } = this.props;

		const input = ev.target;
		if (input.files && input.files[0]) {
			const file = input.files[0];

			const currentFile = {
				originalName: file.name,
				ext: file.name.split(".").pop()
			};

			if (defaultName) {
				currentFile.name = defaultName;
			} else {
				currentFile.name = currentFile.originalName.replace(`.${currentFile.ext}`, "");
			}

			const reader = new FileReader();
			reader.readAsDataURL(input.files[0]);
			reader.onload = e => {
				currentFile.preview = e.target.result;
				this.setState({ currentFile });
			};
		}
	}

	async onSubmit() {
		const { path, isImage, convertImageToWebP, uploadFile, onComplete, onDestroy } = this.props;
		const { currentFile } = this.state;
		const res = await fetch(currentFile.preview);
		const blob = await res.blob();

		const formData = new FormData();
		await formData.append("file", blob);
		await formData.append("path", path);
		await formData.append("name", `${currentFile.name}.${currentFile.ext}`);
		await formData.append("isImage", isImage);
		await formData.append("convertImageToWebP", convertImageToWebP);

		const { name } = await uploadFile(formData);
		await onComplete(name);
		onDestroy();
	}

	clearFile() {
		this.setState({ currentFile: undefined });
		this.inputRef.current.value = null;
	}

	validateFileName() {
		const { currentFile } = this.state;
		if (currentFile) {
			return !currentFile.name.match(/[^A-Za-z0-9_-]+/gi);
		}
	}

	renderPreview() {
		const { isImage } = this.props;
		const { currentFile } = this.state;

		if (isImage && currentFile && currentFile.preview) {
			return <img src={currentFile.preview} />;
		}
	}

	renderNameOptions() {
		const { allowCustomName, fileNames, isImage, convertImageToWebP } = this.props;
		const { currentFile } = this.state;

		if (currentFile) {
			const content = [
				<input
					key="name"
					type="text"
					placeholder="File Name"
					disabled={!allowCustomName}
					value={currentFile.name}
					onChange={ev =>
						this.setState({
							currentFile: {
								...currentFile,
								name: ev.target.value
							}
						})
					}
				/>
			];

			//Check for a valid name
			if (!this.validateFileName()) {
				content.push(
					<span className="error">
						Filename can only consist of numbers, letters, hyphens and underscores
					</span>
				);
			}

			//Check for duplicates
			const extensionsToCheck = [currentFile.ext];
			if (isImage && convertImageToWebP) {
				extensionsToCheck.push("webp");
			}

			extensionsToCheck.forEach(ext => {
				const fileName = `${currentFile.name}.${ext}`.toLowerCase();
				if (fileNames.find(f => f.toLowerCase() == fileName)) {
					content.push(
						<span className="error" key="error">
							Warning: {fileName} will be permanently overwritten on the server. This
							may effect other items
						</span>
					);
					return false;
				}
			});

			return content;
		}
	}

	renderButtons() {
		const { onDestroy } = this.props;
		const { currentFile } = this.state;

		if (currentFile) {
			return (
				<div className="buttons">
					<button type="button" onClick={() => this.clearFile()}>
						Clear
					</button>
					<button
						type="button"
						className="confirm"
						disabled={!currentFile.name.length || !this.validateFileName()}
						onClick={() => this.onSubmit(this.state.image)}
					>
						Upload
					</button>
				</div>
			);
		} else {
			return (
				<div className="buttons">
					<button type="button" onClick={onDestroy}>
						Cancel
					</button>
				</div>
			);
		}
	}

	render() {
		const { accept, onDestroy } = this.props;

		return (
			<PopUpDialog onDestroy={onDestroy} fullSize={true}>
				<div className="image-uploader">
					<input
						accept={accept.map(ext => `.${ext.replace(/^\./, "")}`).join(",")}
						key="input"
						type="file"
						ref={this.inputRef}
						onChange={ev => this.onChange(ev)}
					/>
					{this.renderPreview()}
					{this.renderNameOptions()}
					{this.renderButtons()}
				</div>
			</PopUpDialog>
		);
	}
}

FileUploader.propTypes = {
	accept: PropTypes.arrayOf(PropTypes.string),
	allowCustomName: PropTypes.bool,
	convertImageToWebP: PropTypes.bool,
	defaultName: PropTypes.string,
	nameOptions: PropTypes.arrayOf(PropTypes.objectOf(PropTypes.string)),
	fileNames: PropTypes.arrayOf(PropTypes.string),
	isImage: PropTypes.bool,
	path: PropTypes.string.isRequired,
	onComplete: PropTypes.func.isRequired,
	onDestroy: PropTypes.func.isRequired
};

FileUploader.defaultProps = {
	allowCustomName: true,
	convertImageToWebP: true,
	fileNames: [],
	isImage: false,
	nameOptions: [],
	initialPreviewSrc: null
};

export default connect(
	null,
	{ uploadFile }
)(FileUploader);
