import { account, avatars, databases, roles, storage } from "./appwrite.js";
import { ID, Query } from "appwrite";
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginModal = document.querySelector('[login-modal]');
const formAdd = document.getElementById('form-add');
const fileInput = document.getElementById('fileInput');
const searchBar = document.getElementById('search-bar');
const searchBtn = document.getElementById('search-btn');
const menuIcon = document.getElementById('checkbox');
const sideBar = document.getElementById('sidebar');
const grid = document.querySelector('.video-grid');
const cardTemplate = document.querySelector('#card-template');
document.addEventListener('DOMContentLoaded', () => {
    Initialize();
});
async function Initialize() {
    getUser();
    populateGrid(); // Populate with fake templates
    //const currentPage = await getCurrentPage();
    loginBtn.addEventListener('click', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);
    menuIcon.addEventListener('click', handleSideBar);
    formAdd.addEventListener('click', postTruck);
    fileInput.addEventListener('change', convertImage);
    searchBar.addEventListener('input', searchTrucks);
    searchBtn.addEventListener('click', searchTrucks);
    //await loadLanguage(userLang, currentPage);
}
function handleSideBar() {
    sideBar.classList.toggle('active');
}
async function getUser() {
    try {
        loginModal.close();
        const t_username = (await account.get()).name;
        const role = await roles.list();
        document.getElementById('user-name').textContent = t_username;
        document.getElementById('user-team').textContent = role.teams[0].name;
        // Get all the menu items
        const menuItems = document.querySelectorAll('#sidebar a');

        menuItems.forEach(item => {
            // Get the roles that can see this item
            const roles = item.getAttribute('data-role').split(',');

            // Check if the current user's role is included
            if (roles.includes(role.teams[0].name)) {
                item.style.display = 'block'; // Show the item
            } else {
                item.style.display = 'none'; // Hide the item
            }
        });
        const avatar = avatars.getInitials();
        document.getElementById('profile-picture').src = avatar.href;
        document.getElementById('profile-picture2').src = avatar.href;
        loadTrucks();
    }
    catch (error) {
        loginModal.showModal();
        document.getElementById('user-name').textContent = 'Not logged in';
    }
}
async function handleLogin() {
    account.createOAuth2Session(
        'google',
        'http://127.0.0.1:5500/public/',
        'http://127.0.0.1:5500/public/fail'
    );
    const session = await account.getSession('current');
    console.log(session);
}
async function handleLogout() {
    await account.deleteSession('current');
    //refresh page
    location.reload();
}

async function postTruck() {
    event.preventDefault();
    showLoader();
    const input = document.getElementById('TruckNumberInputField');
    const truckNumber = input.value.trim();
    const fileId = await uploadWebPImage(convertedBlob, truckNumber);
    const fileURL = await storage.getFileView('669cbd410034f5902774', fileId);
    console.log(fileURL);
    if (truckNumber == "") {
        hideLoader();
        alert('Please enter a truck number.');
        return;
    }
    if (!convertedBlob) {
        hideLoader();
        alert('Please upload and convert an image first.');
        return;
    }

    try {
        const result = await databases.createDocument(
            'tst', // databaseId
            '669cbcd30006ae923e3c', // collectionId
            ID.unique(),// documentId
            {
                Number: truckNumber,
                Picture: fileURL
            }
        );
    } catch (error) {
        console.error("Post trucks error:", error);
        hideLoader();
    }
    location.reload();
}


async function loadTrucks() {
    const trucksData = await databases.listDocuments('tst', '669cbcd30006ae923e3c');
    const truckList = Object.values(trucksData.documents);
    try {
        // Save the result to localStorage
        //localStorage.setItem(cacheKey, JSON.stringify(result));
        // Clear the grid before loading actual trucks
        grid.innerHTML = '';

        truckList.forEach(truck => {
            const div = cardTemplate.content.cloneNode(true);
            div.querySelector('[data-link]').href = "view.html?id=" + truck.$id;
            div.querySelector('[data-thumbnail]').src = truck.Picture;
            div.querySelector('[data-title]').textContent = truck.Number;
            grid.appendChild(div);
        });

        const allSkeleton = document.querySelectorAll('.skeleton');
        allSkeleton.forEach(item => {
            item.classList.remove('skeleton');
        });
    } catch (error) {
        console.error('Error:', error);
    }
}
async function searchTrucks() {
    const trucksData = await databases.listDocuments(
        'tst',
        '669cbcd30006ae923e3c',
        [
            Query.contains('Number', searchBar.value)
        ]
    );
    const truckList = Object.values(trucksData.documents);
    console.log(truckList);
    try {
        // Save the result to localStorage
        //localStorage.setItem(cacheKey, JSON.stringify(result));
        // Clear the grid before loading actual trucks
        grid.innerHTML = '';

        truckList.forEach(truck => {
            const div = cardTemplate.content.cloneNode(true);
            div.querySelector('[data-link]').href = "view.html?id=" + truck.$id;
            div.querySelector('[data-thumbnail]').src = truck.Picture;
            div.querySelector('[data-title]').textContent = truck.Number;
            grid.appendChild(div);
            console.log(truck);
        });

        const allSkeleton = document.querySelectorAll('.skeleton');
        allSkeleton.forEach(item => {
            item.classList.remove('skeleton');
        });
    } catch (error) {
        console.error('Error:', error);
    }
}


//#region Load the grid with the fake templates

const videoHeight = 200 + 16; // Video height + gap
const gridPadding = 32 * 2; // Padding from both sides
const videoWidth = 300 + 16; // Video width + gap

function getNumberOfVideosToFit() {
    const gridWidth = window.innerWidth - gridPadding;
    const gridHeight = window.innerHeight - gridPadding;
    const columns = Math.floor(gridWidth / videoWidth);
    const rows = Math.floor(gridHeight / videoHeight);
    return columns * rows;
}

function populateGrid() {
    const grid = document.querySelector('.video-grid');
    const cardTemplate = document.querySelector('#card-template');
    const numberOfVideos = getNumberOfVideosToFit();

    for (let i = 0; i < numberOfVideos; i++) {
        const div = cardTemplate.content.cloneNode(true);
        div.querySelector('[data-title]').textContent = "Loading...";
        grid.appendChild(div);
    }
}

//#endregion
//#region Image conversion
let convertedBlob = null;

async function convertImage() {
    showLoader();
    const fileInput = document.getElementById('fileInput');
    const canvas = document.getElementById('canvas');
    const uploadButton = document.getElementById('uploadButton').querySelector('span');

    const file = fileInput.files[0];

    if (!file) {
        hideLoader(); // Hide loader if no file is selected
        return;
    }

    uploadButton.textContent = file.name; // Update button text to show the file name
    // Check if the file is already a WebP
    if (file.type === 'image/webp') {
        convertedBlob = file;
        hideLoader(); // Hide loader as no conversion is needed
        return;
    }

    try {
        const imgSrc = await readFileAsDataURL(file);
        const img = await loadImage(imgSrc);
        const blob = await drawImageToCanvas(img, canvas);
        convertedBlob = blob;
    } catch (error) {
        console.error('Error during image conversion:', error);
    } finally {
        hideLoader(); // Hide loader after conversion or error
    }
}
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = error => reject(error);
        img.src = src;
    });
}

function drawImageToCanvas(img, canvas) {
    return new Promise((resolve) => {
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(blob => resolve(blob), 'image/webp');
    });
}
//#endregion

//#region WebP image upload
async function uploadWebPImage(blob, truckNumber) {
    const filePath = `IMG_${truckNumber}.webp`;
    let file = new File([blob], filePath, {
        type: blob.type,
        lastModified: Date.now()
    });
    const result = await storage.createFile(
        '669cbd410034f5902774', // bucketId
        ID.unique(), // fileId
        file
    );

    return result.$id;
    const apiURL = 'https://api.backendless.com/C7DCE9F8-9E7D-4D56-BFB5-A0315B70F95C/1324AB59-19C3-400A-A57F-48AADA065503/files/';
    //const filePath = `trucks/IMG_${truckNumber}.webp`; // Use the truck number in the file name
    const uploadURL = apiURL + filePath;

    const formData = new FormData();
    formData.append('file', blob, filePath);

    try {
        const response = await fetch(uploadURL, {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        console.log('File uploaded successfully:', data);
        return data.fileURL;
    } catch (error) {
        console.error('Error uploading file:', error);
        alert('Failed to upload the WebP image.');
        hideLoader();
    }
    return "";
}
//#endregion

//#region Loader
function showLoader() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function hideLoader() {
    document.getElementById('loadingOverlay').style.display = 'none';
}
//#endregion