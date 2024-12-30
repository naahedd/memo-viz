const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);

camera.position.z = 12;
camera.position.y = 0;

const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const galleryGroup = new THREE.Group();
scene.add(galleryGroup);

const blocks = [];

const radius = 6;
const height = 30;
const segments = 30;

const cylinderGeometry = new THREE.CylinderGeometry(
    radius,
    radius,
    height,
    segments,
    1,
    true
);

const cylinderMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.1,
    side: THREE.DoubleSide,
});

const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
galleryGroup.add(cylinder);

const textureLoader = new THREE.TextureLoader();

// Function to find all images in the assets directory
async function findAvailableImages() {
    try {
        // Fetch the list of files from your assets directory
        const response = await fetch('assets/');
        const text = await response.text();
        
        // Create a temporary element to parse the directory listing
        const parser = new DOMParser();
        const doc = parser.parseFromString(text, 'text/html');
        
        // Find all links (files) in the directory
        const links = Array.from(doc.querySelectorAll('a'));
        
        // Filter for image files
        imageFiles = links
            .map(link => link.href)
            .filter(href => isImageFile(href))
            .map(href => href.split('/').pop()); // Get just the filename
        
        // Initialize unusedImages with all available images
        unusedImages = [...imageFiles];
        
        console.log(`Found ${imageFiles.length} unique images:`, imageFiles);
        return imageFiles.length;
    } catch (error) {
        console.error('Error scanning directory:', error);
        return 0;
    }
}

// Update the getRandomImage function
function getRandomImage() {
    if (imageFiles.length === 0) return null;
    
    // If we've used all images, reset the unused images array
    if (unusedImages.length === 0) {
        unusedImages = [...imageFiles];
    }
    
    // Get a random index from the unused images
    const randomIndex = Math.floor(Math.random() * unusedImages.length);
    // Remove and return the selected image
    const selectedImage = unusedImages.splice(randomIndex, 1)[0];
    
    return selectedImage;
}

// Update the loadImageTexture function
function loadImageTexture(imageName) {
    return new Promise((resolve, reject) => {
        const texture = textureLoader.load(
            `assets/${imageName}`,
            (loadedTexture) => {
                loadedTexture.generateMipmaps = true;
                loadedTexture.minFilter = THREE.LinearMipmapLinearFilter;
                loadedTexture.magFilter = THREE.LinearFilter;
                loadedTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
                resolve(loadedTexture);
            },
            undefined,
            (error) => {
                console.error(`Error loading image ${imageName}:`, error);
                reject(error);
            }
        );
    });
}

function createCurvedPlane(width, height, radius, segments){
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const indices = [];
    const uvs = [];

    const segmentsX = segments * 4;
    const segmentsY = Math.floor(height*12);
    const theta = width / radius;

    for (let y =0; y<= segmentsY; y++){
        const yPos = (y / segmentsY - 0.5) * height;
        for (let x = 0; x <= segmentsX; x++){
            const xAngle = (x/segmentsX - 0.5) * theta;
            const xPos = Math.sin(xAngle) * radius;
            const zPos = Math.cos(xAngle) * radius;
            vertices.push(xPos, yPos, zPos);

            uvs.push((x/segmentsX) * 0.8 + 0.1, y/segmentsY);
    }
}

for (let y = 0; y < segmentsY; y++){
    for (let x = 0; x < segmentsX; x++){
        const a = x + (segmentsX + 1) * y;
        const b = x + (segmentsX + 1) * (y + 1);
        const c = x + 1 + (segmentsX + 1) * (y + 1);
        const d = x + 1 + (segmentsX + 1) * y;
        indices.push(a, b, d);
        indices.push(b, c, d);
    }
}   

geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3)
);
geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
geometry.setIndex(indices);
geometry.computeVertexNormals();

return geometry;

}

const NUM_IMAGES = 5; // Your number of images

// Keep only one set of these constants
const numVerticalSections = 6;
const blocksPerSection = 4;
const verticalSpacing = 4.5;
const totalBlockHeight = numVerticalSections * verticalSpacing;
const heightBuffer = (height - totalBlockHeight) / 2;
const startY = -height / 2 + heightBuffer + verticalSpacing;

// Calculate total blocks needed
const totalBlocks = numVerticalSections * blocksPerSection;

const sectionAngle = (Math.PI * 2) / blocksPerSection;
const maxRandomAngle = sectionAngle * 0.3;

async function createBlock(baseY, yOffset, sectionIndex, blockIndex, texture) {
    const blockGeometry = createCurvedPlane(5, 3, radius, 10);
    const blockMaterial = new THREE.MeshPhongMaterial({
        map: texture,
        side: THREE.DoubleSide,
        toneMapped: false,
    });

    const block = new THREE.Mesh(blockGeometry, blockMaterial);
    block.position.y = baseY + yOffset;
    
    const blockContainer = new THREE.Group();
    const sectionAngle = (Math.PI * 2) / blocksPerSection;
    const baseAngle = sectionAngle * blockIndex;
    const maxRandomAngle = sectionAngle * 0.3;
    const randomAngleOffset = (Math.random() * 2 - 1) * maxRandomAngle;
    const finalAngle = baseAngle + randomAngleOffset;

    blockContainer.rotation.y = finalAngle;
    blockContainer.add(block);

    return blockContainer;
}

async function initializeBlocks() {
    const baseY = startY;
    let blockCount = 0;

    for (let section = 0; section < numVerticalSections; section++) {
        const sectionY = baseY + section * verticalSpacing;

        for (let i = 0; i < blocksPerSection; i++) {
            const yOffset = Math.random() * 0.2 - 0.1;
            const blockContainer = await createBlock(sectionY, yOffset, section, i);
            blocks.push(blockContainer);
            galleryGroup.add(blockContainer);
            blockCount++;
        }
    }
}

const lenis = new Lenis({
    autoRaf: true,
});

let currentScroll = 0;
const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
let rotationSpeed = 0;
const baseRotationSpeed = 0.0025;
const maxRotationSpeed = 0.05;

lenis.on("scroll", (e) => {
    currentScroll = window.pageYOffset;
    rotationSpeed = e.velocity * 0.005;
});

function animate() {
    requestAnimationFrame(animate);

    const scrollFraction = currentScroll / totalScroll;
    const targetY = scrollFraction * height - height / 2;
    camera.position.y = -targetY;

    galleryGroup.rotation.y += baseRotationSpeed + rotationSpeed;
    rotationSpeed *= 2;

    renderer.render(scene, camera);
}
// Modify the initialization to be sequential
async function init() {
    // Create empty cylinder
    const cylinderGeometry = new THREE.CylinderGeometry(
        radius,
        radius,
        height,
        segments,
        1,
        true
    );

    const cylinderMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
    });

    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    galleryGroup.add(cylinder);

    setupImageUpload();
    animate();
}

// Start the initialization
init().catch(error => {
    console.error('Initialization failed:', error);
});

// Set a dark background color
renderer.setClearColor(0x000000, 0);

class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audio');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.searchInput = document.getElementById('searchInput');
        this.searchResults = document.getElementById('searchResults');
        this.progressBar = document.querySelector('.progress');
        this.trackName = document.querySelector('.track-name');
        this.currentTime = document.querySelector('.current-time');
        this.duration = document.querySelector('.duration');
        this.progressContainer = document.querySelector('.progress-bar');
        
        this.isPlaying = false;
        
        // Single pre-loaded song
        this.songs = [
            {
                title: "Sunset Dreams",
                artist: "Lofi Beats",
                preview: "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3"
            }
        ];

        this.initializeLocalSearch();
        this.initializeEvents();
    }

    initializeLocalSearch() {
        this.searchInput.placeholder = "Search from library...";
        
        this.searchInput.addEventListener('input', () => {
            const query = this.searchInput.value.toLowerCase().trim();
            
            if (!query) {
                this.searchResults.style.display = 'none';
                return;
            }

            const results = this.songs.filter(song => 
                song.title.toLowerCase().includes(query) || 
                song.artist.toLowerCase().includes(query)
            );

            this.searchResults.innerHTML = '';
            
            if (results.length === 0) {
                this.searchResults.innerHTML = '<div class="search-result-item">No songs found</div>';
            } else {
                results.forEach(song => {
                    const div = document.createElement('div');
                    div.className = 'search-result-item';
                    div.innerHTML = `
                        <span class="track-title">${song.title}</span>
                        <span class="track-artist">${song.artist}</span>
                    `;
                    div.addEventListener('click', () => this.loadTrack(song));
                    this.searchResults.appendChild(div);
                });
            }

            this.searchResults.style.display = 'block';
        });
    }

    initializeEvents() {
        this.playPauseBtn.addEventListener('click', () => this.togglePlay());
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.handleTrackEnd());
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());

        // Close search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.searchResults.contains(e.target) && 
                !this.searchInput.contains(e.target)) {
                this.searchResults.style.display = 'none';
            }
        });

        this.progressContainer.addEventListener('click', (e) => this.seek(e));
    }

    loadTrack(song) {
        this.audio.src = song.preview;
        this.trackName.textContent = `${song.title} - ${song.artist}`;
        this.searchResults.style.display = 'none';
        this.searchInput.value = '';
        this.play();
    }

    togglePlay() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        this.audio.play();
        this.isPlaying = true;
        this.updatePlayPauseIcon();
    }

    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayPauseIcon();
    }

    updatePlayPauseIcon() {
        const playIcon = this.playPauseBtn.querySelector('.play-icon');
        const pauseIcon = this.playPauseBtn.querySelector('.pause-icon');
        
        if (this.isPlaying) {
            playIcon.classList.add('hidden');
            pauseIcon.classList.remove('hidden');
        } else {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        }
    }

    updateProgress() {
        const percent = (this.audio.currentTime / this.audio.duration) * 100;
        this.progressBar.style.width = `${percent}%`;
        this.currentTime.textContent = this.formatTime(this.audio.currentTime);
    }

    updateDuration() {
        this.duration.textContent = this.formatTime(this.audio.duration);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    handleTrackEnd() {
        this.isPlaying = false;
        this.updatePlayPauseIcon();
        this.progressBar.style.width = '0%';
    }

    seek(event) {
        // Get the bounds of the progress bar
        const bounds = this.progressContainer.getBoundingClientRect();
        
        // Calculate click position relative to the progress bar
        const clickPosition = event.clientX - bounds.left;
        const containerWidth = bounds.width;
        
        // Calculate percentage and set time
        const percentage = clickPosition / containerWidth;
        const duration = this.audio.duration;
        this.audio.currentTime = percentage * duration;
        
        // Update progress bar immediately
        this.progressBar.style.width = `${percentage * 100}%`;
    }
}

// Initialize the music player
document.addEventListener('DOMContentLoaded', () => {
    const musicPlayer = new MusicPlayer();
});

function setupImageUpload() {
    const uploadButton = document.createElement('button');
    uploadButton.className = 'upload-button';
    uploadButton.textContent = 'Add Images';
    uploadButton.style.position = 'fixed';
    uploadButton.style.top = '20px';
    uploadButton.style.left = '20px';
    uploadButton.style.zIndex = '1000';
    document.body.appendChild(uploadButton);

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    uploadButton.onclick = () => fileInput.click();

    fileInput.addEventListener('change', async (event) => {
        const files = Array.from(event.target.files);
        const maxBlocks = numVerticalSections * blocksPerSection; // Maximum number of blocks that can fit

        for (const file of files) {
            if (blocks.length >= maxBlocks) {
                alert('Gallery is full! Maximum number of images reached.');
                break;
            }
            
            try {
                const texture = await loadImageFile(file);
                const sectionIndex = Math.floor(blocks.length / blocksPerSection);
                const blockIndex = blocks.length % blocksPerSection;
                const yOffset = Math.random() * 0.2 - 0.1;
                const sectionY = startY + (sectionIndex * verticalSpacing);
                const blockContainer = await createBlock(sectionY, yOffset, sectionIndex, blockIndex, texture);
                
                if (blockContainer) {
                    blocks.push(blockContainer);
                    galleryGroup.add(blockContainer);
                }
            } catch (error) {
                console.error('Error loading image:', error);
            }
        }
    });
}

// Add this function to load uploaded files
function loadImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const texture = new THREE.TextureLoader().load(e.target.result);
            resolve(texture);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
