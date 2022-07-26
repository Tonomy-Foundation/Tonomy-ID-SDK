pipeline {
    agent any
    tools {nodejs "node16.16"}
    stages {
        stage('install') {
            steps {
                //cd /var/repo
               sh 'npm install'
            }
        }
        stage('build') {
            steps {
               sh 'npm run build'
            }
        }

        stage('test') {
            steps {
               sh 'npm run test'
            }
        }

        stage('start') {
            steps {
               sh 'npm run start'
            }
        }
    }
}
