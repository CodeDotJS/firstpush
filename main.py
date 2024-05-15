import math
import requests
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

headers = {
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://github.com/',
    'Connection': 'keep-alive',
}

@app.route('/fetch', methods=['POST'])
def first_push():
    repository = request.json.get('repository')
    if not repository:
        return jsonify({'error': 'Repository not provided in the request.'}), 400

    github_url = f"https://github.com/{repository}"
    response = requests.get(github_url, headers=headers)

    if response.status_code == 200:
        total_commits = response.text.split('commitCount":"')[1].split('"')[0]
        commit_count = normalize(total_commits)
        page = math.ceil(commit_count / 30)

        with requests.Session() as session:
            api_url = f"https://api.github.com/repos/{repository}/commits?page={page}"
            api_response = session.get(api_url, headers=headers)

            repo_data = f"https://api.github.com/repos/{repository}"
            repo_response = session.get(repo_data, headers=headers)

        if api_response.status_code == 200:
            commits_data = api_response.json()
            stats = repo_response.json()

            first_commit = commits_data[-1]

            if "author" in first_commit and first_commit["author"] is not None and "login" in first_commit["author"]:
                username = first_commit["author"]["login"]
            else:
                username = first_commit["html_url"].split('/')[3]

            profile_url = f"https://api.github.com/users/{username}"
            profile_response = session.get(profile_url, headers=headers)
            user_data = profile_response.json()

            if commits_data:
                data = {
                "user": user(user_data),
                "stats": repo_stats(stats),
                "commit": {
                    "name": repository.split('/')[1],
                    "repository": github_url,
                    "date": first_commit["commit"]["author"]["date"],
                    "message": first_commit["commit"]["message"],
                    "commit": first_commit["html_url"],
                    "email": first_commit["commit"]["author"]["email"]
                    }
                }
                return jsonify(data)
            else:
                return jsonify({'error': 'No commits found for the repository.'}), 404
        else:
            return jsonify({'error': f"Error fetching data from GitHub API: {api_response.status_code}"}), 500
    else:
        return jsonify({'error': f"Error fetching data from GitHub: {response.status_code}"}), 500

def user(user_data):
    return {
        "avatar": user_data["avatar_url"],
        "bio": user_data["bio"],
        "blog": user_data["blog"],
        "followers": user_data["followers"],
        "following": user_data["following"],
        "id": user_data["id"],
        "location": user_data["location"],
        "username": user_data["login"],
        "name": user_data["name"],
        "repositories": user_data["public_repos"],
        "twitter": user_data["twitter_username"],
        "type": user_data["type"],
        "joined": user_data["created_at"]
    }

def repo_stats(stats):
    return {
        "size": stats["size"],
        "stars": stats["stargazers_count"],
        "forks": stats["forks"]
    }

def normalize(total_commits):
    try:
        commit_count = int(total_commits.replace(',', ''))
        return commit_count
    except ValueError:
        return 0

if __name__ == '__main__':
    app.run()
