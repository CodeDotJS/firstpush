document.addEventListener("DOMContentLoaded", function() {
    function debounce(func, delay) {
        let timer;
        return function(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => func.apply(this, args), delay);
        };
    }

    const searchInput = document.getElementById('searchInput');
    const suggestionsList = document.getElementById('suggestionsList');
    const userCard = document.getElementById('userCard');
    const loadingBar = document.getElementById('loadingBar');
    let cache = {
        searchResults: {},
        userData: {}
    };

    searchInput.addEventListener('input', debounce(async () => {
        const query = searchInput.value.trim();
        if (query.length === 0) {
            suggestionsList.innerHTML = '';
            return;
        }

        if (cache.searchResults[query]) {
            renderSuggestions(cache.searchResults[query]);
        } else {
            try {
                const response = await fetch(`https://api.github.com/search/repositories?q=${query}&per_page=3`);
                const data = await response.json();
                const items = data.items;
                cache.searchResults[query] = items;
                renderSuggestions(items);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        }
    }, 600));

    function renderSuggestions(items) {
        suggestionsList.innerHTML = '';
        items.forEach(item => {
            const li = document.createElement('li');
            li.classList.add('suggestion-item');
            li.textContent = item.full_name;
            li.dataset.repository = item.full_name;
            suggestionsList.appendChild(li);
        });
        suggestionsList.classList.add('show');
    }

    suggestionsList.addEventListener('click', async (event) => {
        if (event.target.classList.contains('suggestion-item')) {
            const repositoryName = event.target.dataset.repository;
            await sendData(repositoryName);
        }
    });

    searchInput.addEventListener('keydown', async (event) => {
        if (event.key === 'Enter') {
            const firstSuggestion = suggestionsList.querySelector('.suggestion-item');
            if (firstSuggestion) {
                const repositoryName = firstSuggestion.dataset.repository;
                await sendData(repositoryName);
            }
        }
    });

    async function sendData(repositoryName) {
        if (cache.userData[repositoryName]) {
            renderUserCard(cache.userData[repositoryName]);
        } else {
            loadingBar.style.display = 'block';
            const userData = await sendRepositoryToBackend(repositoryName);
            loadingBar.style.width = '0%';
            loadingBar.style.display = 'none';
            if (userData) {
                cache.userData[repositoryName] = userData;
                renderUserCard(userData);
            }
        }
        searchInput.value = '';
        suggestionsList.innerHTML = '';
        suggestionsList.classList.remove('show');
    }


    function extractCommitShortCode(url) {
        return url.split('commit/')[1].slice(0, 7);
    }

    async function sendRepositoryToBackend(repositoryName) {
        try {
            const response = await fetch('/fetch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ repository: repositoryName })
            });
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error sending data to backend:', error);
        }
    }

    function formatDate(date) {
        return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function calculateYearsAndDays(commitDate) {
        const now = new Date();
        const diffInMs = now.getTime() - commitDate.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        const years = (diffInDays / 365).toFixed(1);
        const remainingDays = diffInDays;
        return { years, remainingDays };
    }

    function convertToMB(sizeInKB) {
        return (sizeInKB / 1024).toFixed(2);
    }

    function renderUserCard(userData) {
        const username = userData.user.username;

        document.getElementById('avatar').src = userData.user.avatar;
        document.getElementById('name').innerHTML = `<a href="https://github.com/${username}"> ${userData.user.name}</a>`;
        document.getElementById('bio').innerText = userData.user.bio;
        document.getElementById('followers').innerText = userData.user.followers;
        document.getElementById('following').innerText = userData.user.following;
        document.getElementById('repositories').innerText = userData.user.repositories;
        document.getElementById('blogLink').href = userData.user.blog;

        const commitInfo = document.getElementById('commitInfo');
        const commitDate = new Date(userData.commit.date);
        const commitMessage = userData.commit.message;
        const repoLink = userData.commit.repository;
        const commitLink = userData.commit.commit;
        const repoName = userData.commit.name;

        const blogLink = document.getElementById('blogLink');
        if (userData.user.blog) {
            blogLink.href = userData.user.blog;
            blogLink.style.display = 'inline-block';
        } else {
            blogLink.style.display = 'none';
        }

        commitInfo.innerHTML = '';

        const repositoryInfo = document.getElementById('repositoryInfo');
        const commitName = repositoryInfo.querySelector('.commitName');
        const stars = repositoryInfo.querySelector('.stars');
        const forks = repositoryInfo.querySelector('.forks');
        const size = repositoryInfo.querySelector('.size');

        commitName.textContent = repoName;
        stars.textContent = userData.stats.stars;
        forks.textContent = userData.stats.forks;
        size.textContent = `${convertToMB(userData.stats.size)} MB`;

        const { years, remainingDays } = calculateYearsAndDays(new Date(commitDate));

        commitInfo.innerHTML += `${years} Years (${remainingDays} days) ago on ${formatDate(commitDate)},
    <a href="https://github.com/${username}" target="_blank">@${username}</a> pushed the <a href="${commitLink}" target="_blank">first commit</a>
    to <a href="${repoLink}" target="_blank">${repoName}</a>
    with the commit message - <blockquote>${commitMessage}</blockquote>`;

        userCard.style.display = 'flex';
    }

    const desc = document.getElementById('description');

    function generateRandomColor() {
        const randomColor = 'rgb(' + Math.floor(Math.random() * 256) + ',' +
            Math.floor(Math.random() * 256) + ',' +
            Math.floor(Math.random() * 256) + ')';
        return randomColor;
    }

    setInterval(() => {
        const randomColor = generateRandomColor();
        desc.style.borderBottom = `solid 5px ${randomColor}`;
        desc.style.transition = 'all 1s';
    }, 500);
});
