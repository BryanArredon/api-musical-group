
pipeline {
    agent any

    stages {
        stage('Conexion con GitHub') {
            steps {
                echo 'Jenkins se esta ejecutando correctamente'
                checkout scm
                sh 'git --version'
                sh 'ls -la'
            }
        }
    }
}
