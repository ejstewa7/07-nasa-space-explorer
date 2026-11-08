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

  // Use NASA's APOD RSS feed because the older JSON API currently
  // returns placeholder NASA Science entries.
  function getNASAFeed(startDate, endDate) {
    return fetch('https://science.nasa.gov/feed/apod-basic/')
      .then((response) => {
        if (!response.ok) {
          throw new Error('NASA could not load the space images.');
        }
        return response.text();
      })
      .then((feedText) => {
        const feed = new DOMParser().parseFromString(feedText, 'application/xml');
        const feedItems = feed.getElementsByTagName('item');
        const items = [];

        for (const item of feedItems) {
          const title = item.getElementsByTagName('title')[0]?.textContent;
          const link = item.getElementsByTagName('apod:url')[0]?.textContent;
          const imageUrl = item.getElementsByTagName('apod:hdurl')[0]?.textContent;
          const explanationHtml = item.getElementsByTagName('apod:explanation')[0]?.textContent;
          const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent;

          if (!title || !imageUrl || !pubDate) {
            continue;
          }

          const date = new Date(pubDate);
          const dateText = date.toISOString().split('T')[0];

          if (dateText >= startDate && dateText <= endDate) {
            const explanationElement = document.createElement('div');
            explanationElement.innerHTML = explanationHtml || '';

            items.push({
              title,
              url: imageUrl,
              hdurl: imageUrl,
              date: dateText,
              explanation: explanationElement.textContent.trim(),
              media_type: 'image',
              link,
            });
          }
        }

        return items;
      });
  }

  function getNASAArchive(startDate, endDate) {
    const nextDay = new Date(`${endDate}T00:00:00`);
    nextDay.setDate(nextDay.getDate() + 1);
    const after = encodeURIComponent(`${startDate}T00:00:00`);
    const before = encodeURIComponent(`${nextDay.toISOString().split('T')[0]}T00:00:00`);
    const url = `https://science.nasa.gov/wp-json/wp/v2/image-article?after=${after}&before=${before}&per_page=100&orderby=date&order=desc&_fields=id,date,slug,title,link,content,excerpt`;

    return fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error('NASA could not load the image archive.');
        }
        return response.json();
      })
      .then((records) => {
        const items = [];

        for (const record of records) {
          if (!record.slug || !record.slug.startsWith('apod-')) {
            continue;
          }

          const content = document.createElement('div');
          content.innerHTML = record.content?.rendered || '';
          const image = Array.from(content.querySelectorAll('img')).find((element) => {
            const source = element.src || element.getAttribute('src') || '';
            return source.includes('assets.science.nasa.gov') &&
              !source.includes('nasa-logo');
          });

          if (!image) {
            continue;
          }

          const titleElement = document.createElement('div');
          titleElement.innerHTML = record.title?.rendered || '';
          const titleWithDate = titleElement.textContent.trim();
          const title = titleWithDate.replace(/^APOD:\s*\d{4}\s+\w+\s+\d+\s+[–-]\s*/i, '');

          const excerptElement = document.createElement('div');
          excerptElement.innerHTML = record.excerpt?.rendered || '';
          const explanation = excerptElement.textContent.trim();
          const imageUrl = image.src || image.getAttribute('src');

          items.push({
            title: title || record.slug,
            url: imageUrl,
            hdurl: imageUrl,
            date: record.date.split('T')[0],
            explanation,
            media_type: 'image',
          });
        }

        return items;
      });
  }

  getNASAArchive(startDate, endDate)
    .then(async (archiveItems) => {
      let data = archiveItems;

      if (data.length === 0) {
        data = await getNASAFeed(startDate, endDate);
      }

      gallery.innerHTML = '';

      if (!Array.isArray(data)) {
        throw new Error(data.error?.message || 'NASA could not load the space images.');
      }

      if (data.length === 0) {
        gallery.innerHTML = '<p>No images were found for this date range.</p>';
        return;
      }

      const usableItems = data.filter((item) => {
        if (!item.url || item.title === 'NASA Science') {
          return false;
        }

        return !item.url.includes('nasa-logo@2x.png');
      });

      if (usableItems.length === 0) {
        gallery.innerHTML = '<p>No images were found for this date range.</p>';
        return;
      }

      usableItems.slice(0, 9).forEach((item) => {
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
        const titleText = document.createElement('strong');
        titleText.textContent = item.title;
        title.appendChild(titleText);

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
