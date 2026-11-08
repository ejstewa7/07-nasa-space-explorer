// Find our date picker inputs on the page
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const button = document.getElementById('getImagesButton');
const gallery = document.getElementById('gallery');
const spaceFact = document.getElementById('spaceFact');
const imageModal = document.getElementById('imageModal');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

const spaceFacts = [
  'One day on Venus is longer than one year on Venus.',
  'A day on Mars is about 24 hours and 37 minutes.',
  'Sunlight takes about 8 minutes and 20 seconds to reach Earth.',
  'There are more stars in the universe than grains of sand on Earth.',
  'Neutron stars can spin hundreds of times every second.',
  'Jupiter is the largest planet in our solar system.'
];

const randomFact = spaceFacts[Math.floor(Math.random() * spaceFacts.length)];
spaceFact.textContent = `Did You Know? ${randomFact}`;

// Get images when the button is clicked
button.addEventListener('click', () => {
  const startDate = startInput.value;
  const endDate = endInput.value;

  if (!startDate || !endDate) {
    gallery.innerHTML = '<p class="gallery-loading">Please select both dates.</p>';
    return;
  }

  if (startDate > endDate) {
    gallery.innerHTML = '<p class="gallery-loading">The start date must be before the end date.</p>';
    return;
  }

  // Show a message while the NASA data is loading
  gallery.innerHTML = '<p class="gallery-loading">Loading space images...</p>';
  button.textContent = 'Generating Images...';
  button.disabled = true;

  const apiUrl = `https://api.nasa.gov/planetary/apod?api_key=nbwMnTbd9HrjzbfHwMwwCDz8CNpGJH6mGGjPnmWW&start_date=${startDate}&end_date=${endDate}`;

  // Try NASA twice, and stop waiting after 20 seconds per attempt.
  function getNASAImages(url, attempt = 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    return fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error('NASA could not load the space images.');
        }
        return response.json();
      })
      .catch((error) => {
        if (attempt === 1) {
          return getNASAImages(url, 2);
        }

        if (error.name === 'AbortError') {
          throw new Error('NASA took too long to respond. Please try again.');
        }
        throw error;
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });
  }

  getNASAImages(apiUrl)
    .then((data) => {
      gallery.innerHTML = '';

      if (!Array.isArray(data)) {
        throw new Error(data.error?.message || 'NASA could not load the space images.');
      }

      if (data.length === 0) {
        gallery.innerHTML = '<p>No images were found for this date range.</p>';
        return;
      }

      data.reverse();

      data.slice(0, 9).forEach((item) => {
        const card = document.createElement('div');
        card.className = 'gallery-item';

        if (item.media_type === 'image') {
          const image = document.createElement('img');
          image.src = item.url;
          image.alt = item.title;
          image.loading = 'lazy';

          // Some NASA images have a separate high-resolution URL.
          // If the normal image cannot load, try the high-resolution URL.
          image.addEventListener('error', () => {
            if (item.hdurl && image.src !== item.hdurl) {
              image.src = item.hdurl;
            } else {
              image.remove();
              const unavailable = document.createElement('p');
              unavailable.className = 'image-unavailable';
              unavailable.textContent = 'Image could not be loaded.';
              card.prepend(unavailable);
            }
          });

          image.addEventListener('click', () => {
            modalImage.src = item.hdurl || item.url;
            modalImage.alt = item.title;
            modalTitle.textContent = item.title;
            modalDate.textContent = item.date;
            modalExplanation.textContent = item.explanation;
            imageModal.classList.add('open');
            imageModal.setAttribute('aria-hidden', 'false');
          });
          card.appendChild(image);
        } else {
          const videoButton = document.createElement('button');
          videoButton.className = 'video-preview';
          videoButton.textContent = `Watch Video: ${item.title}`;
          videoButton.addEventListener('click', () => {
            window.open(item.url, '_blank', 'noopener,noreferrer');
          });
          card.appendChild(videoButton);
        }

        const title = document.createElement('p');
        title.innerHTML = `<strong>${item.title}</strong>`;

        const date = document.createElement('p');
        date.textContent = item.date;

        card.appendChild(title);
        card.appendChild(date);
        gallery.appendChild(card);
      });

      if (gallery.innerHTML === '') {
        gallery.innerHTML = '<p>No images were found for this date range.</p>';
      }
    })
    .catch((error) => {
      gallery.innerHTML = `<p>${error.message}</p>`;
    })
    .finally(() => {
      button.textContent = 'Get Space Images';
      button.disabled = false;
    });
});

imageModal.addEventListener('click', (event) => {
  if (event.target === imageModal) {
    imageModal.classList.remove('open');
    imageModal.setAttribute('aria-hidden', 'true');
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    imageModal.classList.remove('open');
    imageModal.setAttribute('aria-hidden', 'true');
  }
});
