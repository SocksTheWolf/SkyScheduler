/*
 * Modal
 *
 * Pico.css - https://picocss.com
 * Copyright 2019-2025 - Licensed under MIT
 * Modified by Yohn https://github.com/Yohn/PicoCSS
 * Modified by Socks https://github.com/SocksTheWolf/SkyScheduler/commit/bedc90a432df6c4c13fd4a41fa6e0050e7a241c8
 */
//document.addEventListener("DOMContentLoaded", () => {
	// Config
	const isOpenClass = "modal-is-open";
	const openingClass = "modal-is-opening";
	const closingClass = "modal-is-closing";
	const scrollbarWidthCssVar = "--pico-scrollbar-width";
	const animationDuration = 400; // ms
	let visibleModal = null;

	// Toggle modal
	const toggleModal = (event) => {
		event.preventDefault();
		const modal = document.getElementById(event.currentTarget.dataset.target);
		if (!modal) return;
		if(event.currentTarget.dataset.close) {
			const modalClose = document.getElementById(event.currentTarget.dataset.close);
			if(modalClose){
				closeModal(modalClose);
				setTimeout(() => modal && (modal.open ? closeModal(modal) : openModal(modal)), animationDuration);
			}
		} else {
			modal && (modal.open ? closeModal(modal) : openModal(modal));
		}
	};

	// Open modal
	const openModal = (modal) => {
		const { documentElement: html } = document;
		if (!document.querySelector("dialog[open]")) {
			const scrollbarWidth = getScrollbarWidth();
			if (scrollbarWidth) {
				html.style.setProperty(scrollbarWidthCssVar, `${scrollbarWidth}px`);
			}
			html.classList.add(isOpenClass, openingClass);
		} else {
			html.classList.add(isOpenClass);
		}
		setTimeout(() => {
			visibleModal = modal;
			html.classList.remove(openingClass);
		}, animationDuration);
		modal.showModal();
	};

	// Close modal
	const closeModal = (modal) => {
		const { documentElement: html } = document;
		if (!document.querySelector(`dialog[open]:not(#${visibleModal.id})`))
			html.classList.add(closingClass);
		visibleModal = null;
		setTimeout(() => {
			html.classList.remove(closingClass, isOpenClass);
			html.style.removeProperty(scrollbarWidthCssVar);
			modal.close();
			if (getNextModal = document.querySelector("dialog[open]"))
				visibleModal = getNextModal;
		}, animationDuration);
	};

	// Close with a click outside
	document.addEventListener("click", (event) => {
		if (visibleModal === null) return;
		const modalContent = visibleModal.querySelector("article");
		const isClickInside = modalContent.contains(event.target);
		!isClickInside && closeModal(visibleModal);
	});

	// Close with Esc key
	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && visibleModal) {
			closeModal(visibleModal);
		}
	});

	// Get scrollbar width
	const getScrollbarWidth = () => {
		const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
		return scrollbarWidth;
	};

	// Is scrollbar visible
	const isScrollbarVisible = () => {
		return document.body.scrollHeight > screen.height;
	};
//})
