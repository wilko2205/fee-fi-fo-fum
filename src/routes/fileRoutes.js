import * as FileController from "../controllers/fileController";
import requireAdmin from "../middlewares/requireAdmin";
import upload from "../middlewares/upload";

export default app => {
	app.get("/api/files/:path", requireAdmin, FileController.getFiles);
	app.post("/api/file", requireAdmin, upload.single("file"), FileController.uploadFile);
};
