document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    // =========================================
    // DOM ELEMENTS
    // =========================================

    const photoInput = document.getElementById("photoInput");
    const choosePhotosBtn = document.getElementById("choosePhotosBtn");

    const photoList = document.getElementById("photoList");
    const emptyPhotoMessage = document.getElementById("emptyPhotoMessage");

    const photoCount = document.getElementById("photoCount");
    const selectedPhotos = document.getElementById("selectedPhotos");
    const totalCopies = document.getElementById("totalCopies");

    const generatePdfBtn = document.getElementById("generatePdfBtn");

    // PHOTO SIZE SETTINGS
    const photoSizeSelect = document.getElementById("photoSizeSelect");
    const customSizeFields = document.getElementById("customSizeFields");
    const customPhotoWidth = document.getElementById("customPhotoWidth");
    const customPhotoHeight = document.getElementById("customPhotoHeight");
    const photoSizeSummary = document.getElementById("photoSizeSummary");
    const printInformationText = document.getElementById("printInformationText");
    const photosPerRow = document.getElementById("photosPerRow");

    const MAX_PHOTOS = 20;

    // =========================================
    // NOTIFICATION SYSTEM
    // =========================================

    function showNotification(message, type = "info", duration = 4000) {
        let container = document.getElementById("notificationContainer");

        if (!container) {
            container = document.createElement("div");
            container.id = "notificationContainer";

            Object.assign(container.style, {
                position: "fixed",
                top: "20px",
                right: "20px",
                zIndex: "999999",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                width: "min(360px, calc(100vw - 40px))",
                pointerEvents: "none"
            });

            document.body.appendChild(container);
        }

        const styles = {
            success: {
                color: "#166534",
                background: "#f0fdf4",
                border: "#86efac",
                title: "Success"
            },

            error: {
                color: "#991b1b",
                background: "#fef2f2",
                border: "#fca5a5",
                title: "Something went wrong"
            },

            warning: {
                color: "#92400e",
                background: "#fffbeb",
                border: "#fcd34d",
                title: "Attention"
            },

            info: {
                color: "#1e40af",
                background: "#eff6ff",
                border: "#93c5fd",
                title: "Information"
            }
        };

        const selectedStyle = styles[type] || styles.info;

        const notification = document.createElement("div");

        Object.assign(notification.style, {
            padding: "15px 17px",
            borderRadius: "12px",
            border: `1px solid ${selectedStyle.border}`,
            background: selectedStyle.background,
            color: selectedStyle.color,
            boxShadow: "0 8px 25px rgba(0,0,0,0.10)",
            fontFamily: "inherit",
            animation: "passportToastIn 0.25s ease",
            overflowWrap: "anywhere",
            pointerEvents: "auto"
        });

        const heading = document.createElement("strong");
        heading.textContent = selectedStyle.title;

        Object.assign(heading.style, {
            display: "block",
            fontSize: "14px",
            marginBottom: "5px"
        });

        const messageText = document.createElement("div");
        messageText.textContent = message;

        Object.assign(messageText.style, {
            fontSize: "13px",
            lineHeight: "1.5"
        });

        notification.append(heading, messageText);
        container.appendChild(notification);

        if (duration > 0) {
            setTimeout(() => {
                notification.style.transition = "opacity 0.25s ease";
                notification.style.opacity = "0";

                setTimeout(() => notification.remove(), 250);
            }, duration);
        }

        return notification;
    }

    // NOTIFICATION ANIMATION
    if (!document.getElementById("passportNotificationAnimation")) {
        const animationStyle = document.createElement("style");

        animationStyle.id = "passportNotificationAnimation";

        animationStyle.textContent = `
            @keyframes passportToastIn {
                from {
                    opacity: 0;
                    transform: translateX(20px);
                }

                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
        `;

        document.head.appendChild(animationStyle);
    }

    // SAFELY READ SERVER RESPONSES
    async function readJsonResponse(response) {
        const responseText = await response.text();

        if (!responseText) {
            return {};
        }

        try {
            return JSON.parse(responseText);
        } catch {
            return {
                message: responseText.slice(0, 300)
            };
        }
    }

    // =========================================
    // CONSTANTS
    // =========================================

    const ALLOWED_TYPES = [
        "image/jpeg",
        "image/png",
        "image/webp"
    ];

    const PHOTO_SIZE_PRESETS = {
        "30x40": {
            width: 30,
            height: 40,
            label: "30 × 40 mm"
        },

        "35x45": {
            width: 35,
            height: 45,
            label: "35 × 45 mm"
        },

        "2x2": {
            width: 50.8,
            height: 50.8,
            label: "2 × 2 inches"
        }
    };

    // A4 PRINT SETTINGS
    const A4_WIDTH_MM = 210;
    const A4_HEIGHT_MM = 297;
    const PAGE_MARGIN_MM = 10;
    const PHOTO_GAP_MM = 2;

    let photos = [];
    let nextPhotoId = 1;

    // =========================================
    // GET CURRENT PHOTO SIZE
    // =========================================

    function getSelectedPhotoSize() {
        const selectedSize = photoSizeSelect.value;

        if (selectedSize === "custom") {
            const width = Number.parseFloat(customPhotoWidth.value);
            const height = Number.parseFloat(customPhotoHeight.value);

            if (
                !Number.isFinite(width) ||
                !Number.isFinite(height) ||
                width < 10 ||
                width > 100 ||
                height < 10 ||
                height > 100
            ) {
                return null;
            }

            return {
                width,
                height,
                label: `${width} × ${height} mm`
            };
        }

        return PHOTO_SIZE_PRESETS[selectedSize] ||
            PHOTO_SIZE_PRESETS["30x40"];
    }

    // =========================================
    // CALCULATE A4 LAYOUT
    // =========================================

    function calculatePrintLayout(size) {
        const availableWidth =
            A4_WIDTH_MM - (2 * PAGE_MARGIN_MM);

        const availableHeight =
            A4_HEIGHT_MM - (2 * PAGE_MARGIN_MM);

        const columns = Math.floor(
            (availableWidth + PHOTO_GAP_MM) /
            (size.width + PHOTO_GAP_MM)
        );

        const rows = Math.floor(
            (availableHeight + PHOTO_GAP_MM) /
            (size.height + PHOTO_GAP_MM)
        );

        return {
            columns,
            rows,
            photosPerPage: columns * rows
        };
    }

    // =========================================
    // UPDATE PHOTO SIZE DISPLAY
    // =========================================

    function updatePhotoSizeSettings() {
        const isCustom = photoSizeSelect.value === "custom";

        customSizeFields.hidden = !isCustom;

        const size = getSelectedPhotoSize();

        if (!size) {
            photoSizeSummary.textContent = "Invalid size";
            photosPerRow.textContent = "—";

            printInformationText.textContent =
                "Please enter a valid custom photo width and height between 10 mm and 100 mm.";

            updateSummary();

            return false;
        }

        const layout = calculatePrintLayout(size);

        photoSizeSummary.textContent = size.label;

        if (layout.columns < 1 || layout.rows < 1) {
            photosPerRow.textContent = "0";

            printInformationText.textContent =
                "This photo size is too large to fit on an A4 page. Please select a smaller size.";

            updateSummary();

            return false;
        }

        photosPerRow.textContent = layout.columns;

        printInformationText.textContent =
            `${size.label} selected. ${layout.columns} photo(s) per row and ${layout.photosPerPage} photo(s) per A4 page. Actual passport requirements may differ by country or application.`;

        updateSummary();

        return true;
    }

    // =========================================
    // PHOTO SIZE EVENTS
    // =========================================

    photoSizeSelect.addEventListener("change", () => {
        updatePhotoSizeSettings();
    });

    customPhotoWidth.addEventListener("input", () => {
        updatePhotoSizeSettings();
    });

    customPhotoHeight.addEventListener("input", () => {
        updatePhotoSizeSettings();
    });

    // =========================================
    // CHOOSE PHOTOS
    // =========================================

    choosePhotosBtn.addEventListener("click", () => {
        photoInput.click();
    });

    // =========================================
    // UPLOAD PHOTO TO SERVER
    // =========================================

    async function uploadToServer(file) {
        const formData = new FormData();

        formData.append("photo", file);

        const response = await fetch("/upload", {
            method: "POST",
            body: formData
        });

        const result = await readJsonResponse(response);

        if (!response.ok || !result.success) {
            throw new Error(
                result.message || "Photo upload failed."
            );
        }

        return result;
    }

    // =========================================
    // HANDLE PHOTO UPLOAD
    // =========================================

    photoInput.addEventListener("change", async () => {
        const selectedFiles = Array.from(photoInput.files);

        if (!selectedFiles.length) {
            return;
        }

        const remainingSlots = MAX_PHOTOS - photos.length;

        if (remainingSlots <= 0) {
            showNotification(
                "You can upload a maximum of 20 photos.",
                "warning"
            );

            photoInput.value = "";

            return;
        }

        const filesToAdd = selectedFiles.slice(0, remainingSlots);

        if (selectedFiles.length > remainingSlots) {
            showNotification(
                `You can add only ${remainingSlots} more photo(s).`,
                "warning"
            );
        }

        for (const file of filesToAdd) {
            if (!ALLOWED_TYPES.includes(file.type)) {
                showNotification(
                    `${file.name} is not supported. Please use JPG, PNG or WEBP.`,
                    "error"
                );

                continue;
            }

            const photo = {
                id: nextPhotoId++,
                file: file,
                previewUrl: URL.createObjectURL(file),
                copies: 6,
                serverFilename: null,
                uploading: true
            };

            photos.push(photo);

            renderPhotos();

            try {
                const result = await uploadToServer(file);

                photo.serverFilename = result.filename;

                showNotification(
                    `${file.name} uploaded successfully.`,
                    "success"
                );

            } catch (error) {
                showNotification(
                    `${file.name}: ${error.message}`,
                    "error",
                    6000
                );

                photos = photos.filter(
                    item => item.id !== photo.id
                );

                URL.revokeObjectURL(photo.previewUrl);

            } finally {
                photo.uploading = false;

                renderPhotos();
            }
        }

        photoInput.value = "";

        updateSummary();
    });

    // =========================================
    // DISPLAY PHOTO CARDS
    // =========================================

    function renderPhotos() {
        photoList.innerHTML = "";

        photos.forEach((photo) => {
            const card = document.createElement("div");

            card.className = "photo-card";
            card.dataset.photoId = photo.id;

            card.innerHTML = `
                <div class="photo-thumbnail">
                    <img
                        src="${photo.previewUrl}"
                        alt="Passport photo preview"
                    >
                </div>

                <div class="photo-details">
                    <p class="photo-filename"></p>

                    <p class="photo-size">
                        ${photo.uploading ? "Uploading..." : "Ready"}
                    </p>

                    <div class="photo-controls">

                        <label class="copies-label">
                            Copies:
                        </label>

                        <input
                            type="number"
                            class="copies-input"
                            min="1"
                            max="999"
                            value="${photo.copies}"
                            ${photo.uploading ? "disabled" : ""}
                            aria-label="Number of copies"
                        >

                        <button
                            type="button"
                            class="photo-action-button crop-photo-button"
                            data-action="crop"
                            ${photo.uploading ? "disabled" : ""}
                        >
                            Crop Photo
                        </button>

                        <button
                            type="button"
                            class="photo-action-button edit-photo-button"
                            data-action="edit"
                            ${photo.uploading ? "disabled" : ""}
                        >
                            Edit Photo
                        </button>

                        <button
                            type="button"
                            class="photo-action-button background-photo-button"
                            data-action="background"
                            ${photo.uploading ? "disabled" : ""}
                        >
                            Background Editor
                        </button>

                        <button
                            type="button"
                            class="photo-action-button remove-photo-button"
                            data-action="remove"
                        >
                            Remove
                        </button>

                    </div>
                </div>
            `;

            card.querySelector(".photo-filename").textContent =
                photo.file.name;

            photoList.appendChild(card);
        });

        emptyPhotoMessage.hidden = photos.length > 0;

        updateSummary();
    }

    // =========================================
    // UPDATE SUMMARY
    // =========================================

    function updateSummary() {
        const count = photos.length;

        const copies = photos.reduce(
            (total, photo) => total + photo.copies,
            0
        );

        photoCount.textContent = `${count} / ${MAX_PHOTOS} Photos`;

        selectedPhotos.textContent = count;

        totalCopies.textContent = copies;

        const validSize = getSelectedPhotoSize();

        const layout = validSize
            ? calculatePrintLayout(validSize)
            : null;

        const validLayout = layout &&
            layout.columns >= 1 &&
            layout.rows >= 1;

        generatePdfBtn.disabled =
            count === 0 ||
            !validSize ||
            !validLayout ||
            photos.some(photo =>
                photo.uploading || !photo.serverFilename
            );

        choosePhotosBtn.disabled = count >= MAX_PHOTOS;

        choosePhotosBtn.textContent =
            count >= MAX_PHOTOS
                ? "Photo Limit Reached"
                : "Choose Photos";
    }

    // =========================================
    // PHOTO CARD ACTIONS
    // =========================================

    photoList.addEventListener("click", async (event) => {
        const button = event.target.closest(
            "button[data-action]"
        );

        if (!button) {
            return;
        }

        const card = button.closest(".photo-card");

        if (!card) {
            return;
        }

        const photoId = Number(card.dataset.photoId);

        const photo = photos.find(
            item => item.id === photoId
        );

        if (!photo || photo.uploading) {
            return;
        }

        const action = button.dataset.action;

        // REMOVE PHOTO
        if (action === "remove") {
            URL.revokeObjectURL(photo.previewUrl);

            photos = photos.filter(
                item => item.id !== photoId
            );

            renderPhotos();

            showNotification(
                "Photo removed.",
                "success"
            );

            return;
        }

        // =====================================
        // CROP PHOTO
        // =====================================

        if (action === "crop") {
            if (
                typeof window.openPassportCropEditor !== "function"
            ) {
                showNotification(
                    "Crop Editor could not be loaded. Please refresh the page and try again.",
                    "error"
                );

                return;
            }

            button.disabled = true;

            try {
                const croppedFile =
                    await window.openPassportCropEditor(photo.file);

                if (!croppedFile) {
                    return;
                }

                const newPreviewUrl =
                    URL.createObjectURL(croppedFile);

                try {
                    const result =
                        await uploadToServer(croppedFile);

                    URL.revokeObjectURL(photo.previewUrl);

                    photo.file = croppedFile;
                    photo.previewUrl = newPreviewUrl;
                    photo.serverFilename = result.filename;

                    showNotification(
                        "Photo cropped successfully.",
                        "success"
                    );

                } catch (error) {
                    URL.revokeObjectURL(newPreviewUrl);

                    throw error;
                }

            } catch (error) {
                showNotification(
                    error.message || "Could not crop this photo.",
                    "error",
                    6000
                );

            } finally {
                renderPhotos();
            }

            return;
        }

        // =====================================
        // EDIT PHOTO
        // =====================================

        if (action === "edit") {
            if (
                typeof window.openPassportPhotoEditor !== "function"
            ) {
                showNotification(
                    "Photo Editor could not be loaded. Please refresh the page and try again.",
                    "error"
                );

                return;
            }

            button.disabled = true;

            try {
                const editedFile =
                    await window.openPassportPhotoEditor(photo.file);

                if (!editedFile) {
                    return;
                }

                const newPreviewUrl =
                    URL.createObjectURL(editedFile);

                try {
                    const result =
                        await uploadToServer(editedFile);

                    URL.revokeObjectURL(photo.previewUrl);

                    photo.file = editedFile;
                    photo.previewUrl = newPreviewUrl;
                    photo.serverFilename = result.filename;

                    showNotification(
                        "Photo changes applied successfully.",
                        "success"
                    );

                } catch (error) {
                    URL.revokeObjectURL(newPreviewUrl);

                    throw error;
                }

            } catch (error) {
                showNotification(
                    error.message || "Could not edit this photo.",
                    "error",
                    6000
                );

            } finally {
                renderPhotos();
            }

            return;
        }

        // =====================================
        // BACKGROUND EDITOR
        // =====================================

        if (action === "background") {
            if (
                typeof window.openPassportBackgroundEditor !== "function"
            ) {
                showNotification(
                    "Background Editor could not be loaded. Please refresh the page and try again.",
                    "error"
                );

                return;
            }

            button.disabled = true;

            try {
                const result =
                    await window.openPassportBackgroundEditor(
                        photo.file,
                        photo.serverFilename
                    );

                if (!result) {
                    return;
                }

                if (!result.file || !result.filename) {
                    throw new Error(
                        "The edited photo could not be prepared."
                    );
                }

                const newPreviewUrl =
                    URL.createObjectURL(result.file);

                URL.revokeObjectURL(photo.previewUrl);

                photo.file = result.file;
                photo.previewUrl = newPreviewUrl;
                photo.serverFilename = result.filename;

                showNotification(
                    "Photo background changed successfully.",
                    "success"
                );

            } catch (error) {
                showNotification(
                    error.message ||
                    "Could not change the photo background.",
                    "error",
                    6000
                );

            } finally {
                renderPhotos();
            }

            return;
        }
    });

    // =========================================
    // CHANGE NUMBER OF COPIES
    // =========================================

    photoList.addEventListener("change", (event) => {
        if (!event.target.matches(".copies-input")) {
            return;
        }

        const card = event.target.closest(".photo-card");

        if (!card) {
            return;
        }

        const photoId = Number(card.dataset.photoId);

        const photo = photos.find(
            item => item.id === photoId
        );

        if (!photo) {
            return;
        }

        let value = Number.parseInt(
            event.target.value,
            10
        );

        if (!Number.isFinite(value) || value < 1) {
            value = 1;
        }

        if (value > 999) {
            value = 999;
        }

        photo.copies = value;

        event.target.value = value;

        updateSummary();
    });

    // =========================================
    // GENERATE PDF
    // =========================================

    generatePdfBtn.addEventListener("click", async () => {
        const readyPhotos = photos.filter(
            photo => photo.serverFilename && !photo.uploading
        );

        if (readyPhotos.length === 0) {
            showNotification(
                "Please upload at least one photo.",
                "warning"
            );

            return;
        }

        if (readyPhotos.length !== photos.length) {
            showNotification(
                "Please wait until all photos finish uploading.",
                "warning"
            );

            return;
        }

        const selectedSize = getSelectedPhotoSize();

        if (!selectedSize) {
            showNotification(
                "Please enter a valid photo width and height.",
                "warning"
            );

            return;
        }

        const layout = calculatePrintLayout(selectedSize);

        if (layout.columns < 1 || layout.rows < 1) {
            showNotification(
                "This photo size is too large to fit on an A4 page.",
                "warning"
            );

            return;
        }

        const originalButtonText = generatePdfBtn.textContent;

        generatePdfBtn.disabled = true;

        generatePdfBtn.textContent = "Generating PDF...";

        try {
            const response = await fetch("/generate-pdf", {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    photos: readyPhotos.map(photo => ({
                        filename: photo.serverFilename,
                        copies: photo.copies
                    })),

                    photo_width_mm: selectedSize.width,
                    photo_height_mm: selectedSize.height
                })
            });

            if (!response.ok) {
                const errorResult =
                    await readJsonResponse(response);

                throw new Error(
                    errorResult.message || "PDF generation failed."
                );
            }

            const pdfBlob = await response.blob();

            const downloadUrl =
                URL.createObjectURL(pdfBlob);

            const downloadLink =
                document.createElement("a");

            downloadLink.href = downloadUrl;

            downloadLink.download =
                "ST-Passport-Photos.pdf";

            document.body.appendChild(downloadLink);

            downloadLink.click();

            downloadLink.remove();

            showNotification(
                "Your passport photo PDF has been generated successfully.",
                "success",
                5000
            );

            setTimeout(() => {
                URL.revokeObjectURL(downloadUrl);
            }, 1000);

        } catch (error) {
            showNotification(
                error.message || "Could not generate the PDF.",
                "error",
                6000
            );

        } finally {
            generatePdfBtn.textContent = originalButtonText;

            updateSummary();
        }
    });

    // =========================================
    // INITIALIZE DEFAULT SETTINGS
    // =========================================

    updatePhotoSizeSettings();

    renderPhotos();

});