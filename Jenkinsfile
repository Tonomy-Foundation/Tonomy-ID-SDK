pipeline {
    agent none
    stages {
        stage('Build') {
            steps {
                cd /var/repo
                npm i
            }
        }
        stage('Lint') {
            steps {
                npm run lint
            }
        }
        stage('Test') {
            steps {
                npm test
            }
        }
    }
}