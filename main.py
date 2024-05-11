import math
import requests
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

@app.route('/fetch', methods=['POST'])
def get_commit_count():
    repository = request.json.get('repository')
    if not repository:
        return jsonify({'error': 'Repository not provided in the request.'}), 400

    github_url = f"https://github.com/{repository}"
    headers = {'User-Agent': 'Mozilla/5.0'}
    response = requests.get(github_url, headers=headers)

    if response.status_code == 200:
        total_commits = response.text.split('commitCount":"')[1].split('"')[0]
        commit_count = normalize(total_commits)
        page = math.ceil(commit_count / 30)
        api_url = f"https://api.github.com/repos/{repository}/commits?page={page}"
        api_response = requests.get(api_url, headers=headers)

        if api_response.status_code == 200:
            commits_data = api_response.json()
            if commits_data:
                first_commit = commits_data[-1]
                return jsonify({
                    "repository": github_url,
                    "avatar": first_commit["author"]["avatar_url"],
                    "profile": first_commit["author"]["html_url"],
                    "username": first_commit["author"]["login"],
                    "date": first_commit["commit"]["author"]["date"],
                    "name": first_commit["commit"]["author"]["name"],
                    "message": first_commit["commit"]["message"],
                    "commit": first_commit["html_url"]
                })
            else:
                return jsonify({'error': 'No commits found for the repository.'}), 404
        else:
            return jsonify({'error': f"Error fetching data from GitHub API: {api_response.status_code}"}), 500
    else:
        return jsonify({'error': f"Error fetching data from GitHub: {response.status_code}"}), 500

def normalize(total_commits):
    try:
        commit_count = int(total_commits.replace(',', ''))
        return commit_count
    except ValueError:
        return 0

if __name__ == '__main__':
    app.run(debug=True)
