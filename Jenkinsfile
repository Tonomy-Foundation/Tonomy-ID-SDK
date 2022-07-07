pipeline {
    agent none
    stages {
        stage('install') {
            steps {
                //cd /var/repo
                npm install
            }
        }
        stage('build') {
            steps {
                npm run build
            }
        }

        stage('test') {
            steps {
                npm run test
            }
        }

        stage('start') {
            steps {
                npm run start
            }
        }
    }
}