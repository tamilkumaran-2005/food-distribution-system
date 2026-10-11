
const API_URL = "http://localhost:8080/api/providers";

const form = document.getElementById("providerForm");
const nameInput = document.getElementById("providerName");
const dateInput = document.getElementById("foodDate");
const phoneInput = document.getElementById("phone");
const designationInput = document.getElementById("designation");
const tableBody = document.getElementById("providerTable");
const searchInput = document.getElementById("searchInput");
const totalRecords = document.getElementById("totalRecords");
const todayRecords = document.getElementById("todayRecords");
const todayDate = document.getElementById("todayDate");

let records = [];
let editingId = null;

// Today's date: YYYY-MM-DD
function getToday() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Display date as DD-MM-YYYY
function formatDate(date) {
    if (!date) return "";

    const [year, month, day] = date.split("-");
    return `${day}-${month}-${year}`;
}

todayDate.textContent = formatDate(getToday());
dateInput.value = getToday();

// Handle API errors
async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers
        }
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `Request failed: ${response.status}`);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

// Load records from MySQL through Spring Boot
async function loadRecords() {
    try {
        records = await apiRequest(API_URL);
        displayRecords();
    } catch (error) {
        console.error("Load error:", error);

        alert(
            "Database records load aagala. " +
            "Spring Boot running-la irukka nu check pannu."
        );
    }
}

// Update dashboard numbers
function updateDashboard() {
    totalRecords.textContent = records.length;

    const countToday = records.filter(
        record => record.providingDate === getToday()
    ).length;

    todayRecords.textContent = countToday;
}

// Display records and search results
function displayRecords() {
    const searchText = searchInput.value.trim().toLowerCase();

    const filteredRecords = records.filter(record =>
        (record.name || "").toLowerCase().includes(searchText) ||
        (record.phone || "").includes(searchText) ||
        (record.designation || "").toLowerCase().includes(searchText)
    );

    tableBody.innerHTML = "";

    if (filteredRecords.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-message">
                    No records found.
                </td>
            </tr>
        `;

        updateDashboard();
        return;
    }

    filteredRecords.forEach(record => {
        const row = document.createElement("tr");

        const serialNumber = records.findIndex(
            item => item.id === record.id
        ) + 1;

        const values = [
            serialNumber,
            record.name,
            formatDate(record.providingDate),
            record.phone,
            record.designation
        ];

        values.forEach(value => {
            const cell = document.createElement("td");
            cell.textContent = value ?? "";
            row.appendChild(cell);
        });

        const actionCell = document.createElement("td");

        const editButton = document.createElement("button");
        editButton.textContent = "Edit";
        editButton.className = "btn-secondary";
        editButton.type = "button";
        editButton.style.marginRight = "8px";
        editButton.addEventListener("click", () => editRecord(record.id));

        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";
        deleteButton.className = "btn-secondary";
        deleteButton.type = "button";
        deleteButton.addEventListener("click", () => deleteRecord(record.id));

        actionCell.append(editButton, deleteButton);
        row.appendChild(actionCell);
        tableBody.appendChild(row);
    });

    updateDashboard();
}

// Add a new record or update an existing record
form.addEventListener("submit", async function(event) {
    event.preventDefault();

    const name = nameInput.value.trim();
    const providingDate = dateInput.value;
    const phone = phoneInput.value.trim();
    const designation = designationInput.value.trim();

    if (!name || !providingDate || !phone || !designation) {
        alert("Please fill in all four fields.");
        return;
    }

    if (!/^[0-9]{10}$/.test(phone)) {
        alert("Enter a valid 10-digit mobile number.");
        return;
    }

    const provider = {
        name,
        providingDate,
        phone,
        designation
    };

    try {
        if (editingId !== null) {
            await apiRequest(`${API_URL}/${editingId}`, {
                method: "PUT",
                body: JSON.stringify(provider)
            });

            alert("Provider updated successfully!");
            editingId = null;
        } else {
            // Choose where to display the new record
            let position = prompt(
                `Enter list position (1 to ${records.length + 1}).\n` +
                "Leave blank to add at the end."
            );

            if (position === null) {
                return;
            }

            let insertIndex = records.length;

            if (position.trim() !== "") {
                const requestedPosition = Number(position);

                if (
                    !Number.isInteger(requestedPosition) ||
                    requestedPosition < 1 ||
                    requestedPosition > records.length + 1
                ) {
                    alert("Enter a valid list position.");
                    return;
                }

                insertIndex = requestedPosition - 1;
            }

            const savedProvider = await apiRequest(API_URL, {
                method: "POST",
                body: JSON.stringify(provider)
            });

            records.splice(insertIndex, 0, savedProvider);

            alert("Provider saved to database successfully!");
            form.reset();
            dateInput.value = getToday();
            document.querySelector(".btn-primary").textContent =
                "+ Save Provider";

            displayRecords();
            return;
        }

        form.reset();
        dateInput.value = getToday();
        document.querySelector(".btn-primary").textContent =
            "+ Save Provider";

        await loadRecords();
    } catch (error) {
        console.error("Save error:", error);

        alert(
            "Save/update aagala. Spring Boot, MySQL connection " +
            "check pannu. Details: " + error.message
        );
    }
});

// Edit a record
function editRecord(id) {
    const record = records.find(item => item.id === id);

    if (!record) return;

    nameInput.value = record.name;
    dateInput.value = record.providingDate;
    phoneInput.value = record.phone;
    designationInput.value = record.designation;

    editingId = id;

    document.querySelector(".btn-primary").textContent =
        "Update Provider";

    form.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// Delete a record from database
async function deleteRecord(id) {
    const confirmed = confirm(
        "Are you sure you want to delete this record?"
    );

    if (!confirmed) return;

    try {
        await apiRequest(`${API_URL}/${id}`, {
            method: "DELETE"
        });

        records = records.filter(record => record.id !== id);

        if (editingId === id) {
            editingId = null;
            form.reset();
            dateInput.value = getToday();
            document.querySelector(".btn-primary").textContent =
                "+ Save Provider";
        }

        displayRecords();
        alert("Record deleted successfully!");
    } catch (error) {
        console.error("Delete error:", error);
        alert("Delete aagala: " + error.message);
    }
}

// Search records
searchInput.addEventListener("input", displayRecords);

// Clear form
form.addEventListener("reset", function() {
    editingId = null;

    setTimeout(() => {
        dateInput.value = getToday();
        document.querySelector(".btn-primary").textContent =
            "+ Save Provider";
    }, 0);
});

// Load records when page opens
loadRecords();
