const path = require("path");
const ExtractTextPlugin = require("extract-text-webpack-plugin");

//Determine sourcemap settings
const devtool = process.env.NODE_ENV === "production" ? "source-map" : "eval-source-map";

module.exports = {
	module: {
		rules: [
			{
				test: /\.css$/,
				loaders: [
					"style-loader",
					{
						loader: "postcss-loader",
						options: {
							ident: "postcss",
							sourceMap: true,
							plugins: [require("autoprefixer")()]
						}
					},
					"css-loader"
				]
			},
			{
				test: /\.m?js$/,
				loader: "babel-loader",
				exclude: /node_modules\/(?!(kareem|he)\/).*/,
				options: {
					plugins: ["@babel/plugin-transform-arrow-functions"],
					presets: [
						"@babel/preset-react",
						[
							"@babel/preset-env",
							{
								targets: { browsers: ["last 2 versions", "ie >= 11"] }
							}
						]
					]
				}
			},
			{
				test: /\.scss$/,
				use: ExtractTextPlugin.extract({
					fallback: "style-loader",
					use: [
						{
							loader: "css-loader",
							options: {
								sourceMap: true
							}
						},
						{
							loader: "postcss-loader",
							options: {
								ident: "postcss",
								sourceMap: true,
								plugins: [require("autoprefixer")()]
							}
						},
						{
							loader: "fast-sass-loader",
							options: {
								sourceMap: true
							}
						},
						{
							loader: "./config/sassEnvLoader"
						}
					]
				})
			}
		]
	},
	resolve: {
		alias: {
			"~": path.resolve(".")
		}
	},
	plugins: [new ExtractTextPlugin("styles.css")],
	performance: {
		hints: false
	},
	devtool
};
