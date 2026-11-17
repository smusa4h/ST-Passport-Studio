
window.openPassportBackgroundEditor = function (file, serverFilename) {
    return new Promise((resolve) => {
        let selectedColor = "white";
        let processedPhoto = null;
        let processedFilename = null;
        let isFinished = false;
        let originalUrl = URL.createObjectURL(file);

        const overlay = document.createElement("div");
        overlay.className = "background-editor-overlay";

        overlay.innerHTML = `
            <div class="background-editor-modal">
                <div class="background-editor-header">
                    <div>
                        <h2>Photo Background Editor</h2>
                        <p>Remove the old background and choose a new one.</p>
                    </div>
                    <button type="button" class="background-close-button">&times;</button>
                </div>

                <div class="background-editor-preview">
                    <img class="background-preview-image" src="${originalUrl}" alt="Photo preview">
                </div>

                <div class="background-editor-options">
                    <h3>Choose Background Colour</h3>

                    <div class="background-color-options">
                        <button type="button" data-color="white" class="background-color-button active">
                            <span class="color-swatch white-swatch"></span>
                            White
                        </button>

                        <button type="button" data-color="blue" class="background-color-button">
                            <span class="color-swatch blue-swatch"></span>
                            Blue
                        </button>

                        <button type="button" data-color="red" class="background-color-button">
                            <span class="color-swatch red-swatch"></span>
                            Red
                        </button>
                    </div>

                    <p class="background-editor-status">
                        Select a background colour, then click Remove & Apply Background.
                    </p>
                </div>

                <div class="background-editor-actions">
                    <button type="button" class="background-cancel-button">
                        Cancel
                    </button>

                    <button type="button" class="background-apply-button">
                        Remove & Apply Background
                    </button>

                    <button type="button" class="background-use-button" hidden>
                        Use This Photo
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const previewImage = overlay.querySelector(".background-preview-image");
        const statusText = overlay.querySelector(".background-editor-status");
        const applyButton = overlay.querySelector(".background-apply-button");
        const useButton = overlay.querySelector(".background-use-button");
        const cancelButton = overlay.querySelector(".background-cancel-button");
        const closeButton = overlay.querySelector(".background-close-button");
        const colorButtons = overlay.querySelectorAll(".background-color-button");

        function cleanup() {
            overlay.remove();
            URL.revokeObjectURL(originalUrl);

            if (processedPhoto) {
                URL.revokeObjectURL(processedPhoto);
            }
        }

        function finish(result) {
            if (isFinished) return;

            isFinished = true;
            cleanup();
            resolve(result);
        }

        function selectColor(color) {
            selectedColor = color;

            colorButtons.forEach((button) => {
                button.classList.toggle(
                    "active",
                    button.dataset.color === color
                );
            });

            // If the user changes colour after processing,
            // require them to apply the new colour again.
            if (processedPhoto) {
                URL.revokeObjectURL(processedPhoto);
                processedPhoto = null;
                processedFilename = null;

                previewImage.src = originalUrl;
                useButton.hidden = true;
                applyButton.hidden = false;
                applyButton.disabled = false;

                statusText.textContent =
                    "Colour changed. Click Remove & Apply Background again.";
            }
        }

        colorButtons.forEach((button) => {
            button.addEventListener("click", () => {
                selectColor(button.dataset.color);
            });
        });

        applyButton.addEventListener("click", async () => {
            if (!serverFilename) {
                statusText.textContent =
                    "The original photo has not finished uploading.";
                return;
            }

            applyButton.disabled = true;
            statusText.textContent =
                "Removing background with AI. Please wait...";

            try {
                const response = await fetch("/change-background", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        filename: serverFilename,
                        background_color: selectedColor
                    })
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || "Background editing failed."
                    );
                }

                const previewResponse = await fetch(
                    `/photo-preview/${encodeURIComponent(result.filename)}`
                );

                if (!previewResponse.ok) {
                    throw new Error("Could not load the edited photo preview.");
                }

                const blob = await previewResponse.blob();

                processedPhoto = URL.createObjectURL(blob);
                processedFilename = result.filename;

                previewImage.src = processedPhoto;

                statusText.textContent =
                    "Background changed successfully. Review your photo before using it.";

                applyButton.hidden = true;
                useButton.hidden = false;

            } catch (error) {
                statusText.textContent =
                    error.message || "Could not change the photo background.";

                applyButton.disabled = false;
            }
        });

        useButton.addEventListener("click", async () => {
            if (!processedPhoto || !processedFilename) return;

            try {
                const response = await fetch(processedPhoto);
                const blob = await response.blob();

                const editedFile = new File(
                    [blob],
                    `background-edited-${file.name.replace(/\.[^.]+$/, "")}.jpg`,
                    { type: "image/jpeg" }
                );

                finish({
                    file: editedFile,
                    filename: processedFilename
                });

            } catch (error) {
                statusText.textContent =
                    "Could not prepare the edited photo. Please try again.";
            }
        });

        cancelButton.addEventListener("click", () => finish(null));
        closeButton.addEventListener("click", () => finish(null));

        overlay.addEventListener("click", (event) => {
            if (event.target === overlay) {
                finish(null);
            }
        });

        function handleEscape(event) {
            if (event.key === "Escape") {
                finish(null);
                document.removeEventListener("keydown", handleEscape);
            }
        }

        document.addEventListener("keydown", handleEscape);

        const originalFinish = finish;

        // Remove the Escape listener whenever the editor closes.
        function closeEditor(result) {
            document.removeEventListener("keydown", handleEscape);
            originalFinish(result);
        }

        cancelButton.onclick = () => closeEditor(null);
        closeButton.onclick = () => closeEditor(null);
    });
};
