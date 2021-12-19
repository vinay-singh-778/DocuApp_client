import "quill/dist/quill.snow.css";
import Quill from "quill";
import React from "react";
import TOOLBAR_OPTIONS from "../constants/toolbarOptions";
import { io } from "socket.io-client";
import { useParams } from "react-router-dom";
const SAVE_INTERVAL_MS = 2000;
function TextEditor() {
	const { id: documentId } = useParams();
	//to make sure we can access socket from anywhere
	const [socket, setSocket] = React.useState();
	const [quill, setQuill] = React.useState();
	React.useEffect(() => {
		const s = io("http://localhost:3001", {
			transports: ["websocket", "polling", "flashsocket"],
		});
		setSocket(s); //return in socket

		return () => {
			s.disconnect();
		};
	}, []);

	React.useEffect(() => {
		//detecting changes in quill
		if (socket == null || quill == null) return;
		const textChangeHandeler = (delta, oldDelta, source) => {
			if (source !== "user") return;
			socket.emit("send-changes", delta);
		};
		quill.on("text-change", textChangeHandeler);
		return () => {
			quill.off("text-change", textChangeHandeler);
		};
	}, [socket, quill]);

	React.useEffect(() => {
		if (socket == null || quill == null) return;
		const receiveChangeHandeler = (delta) => {
			//update the changes
			quill.updateContents(delta);
		};
		socket.on("receive-changes", receiveChangeHandeler);
		return () => {
			socket.off("receive-changes", receiveChangeHandeler);
		};
	}, [socket, quill]);

	React.useEffect(() => {
		if (socket == null || quill == null) return;
		//for sending back the document to the client
		socket.once("load-document", (document) => {
			quill.setContents(document);
			quill.enable();
		});
		//send up to the server our documentid attach ourselves to the rooms of docs
		//if doc is saved it will return that to us
		socket.emit("get-document", documentId);
	}, [socket, quill, documentId]);

	React.useEffect(() => {
		if (socket == null || quill == null) return;

		const interval = setInterval(() => {
			socket.emit("save-document", quill.getContents());
		}, SAVE_INTERVAL_MS);

		return () => {
			clearInterval(interval);
		};
	}, [socket, quill]);

	const wrapperRef = React.useCallback((wrapper) => {
		if (wrapper == null) return;
		wrapper.innerHTML = "";
		const editor = document.createElement("div");
		wrapper.append(editor);
		const q = new Quill(editor, {
			theme: "snow",
			modules: { toolbar: TOOLBAR_OPTIONS },
		});
		q.disable();
		q.setText("Loading...");
		setQuill(q);
	}, []);

	return <div className='container' ref={wrapperRef}></div>;
}

export default TextEditor;
