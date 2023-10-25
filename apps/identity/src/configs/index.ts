import "dotenv/config";

export const configs = {
    service: "identity",
    environment: process.env.CA_IDENTITY_ENVIRONMENT || "dev",
    app: {
        prefix: "/api/v1",
        host: process.env.CA_IDENTITY_HOST_NAME || "0.0.0.0",
        port: process.env.CA_IDENTITY_PORT_NUMBER || "6808",
    },
    mongo: {
        mode: process.env.CA_IDENTITY_MONGO_MODE || "STANDALONE",
        replicaName: process.env.CA_IDENTITY_MONGO_REPLICA_NAME || "rs0",
        addresses: process.env.CA_IDENTITY_MONGO_ADDRESSES || "127.0.0.1:27001",
        username: process.env.CA_IDENTITY_MONGO_USERNAME || "root",
        password: process.env.CA_IDENTITY_MONGO_PASSWORD || "",
        authSource: process.env.CA_IDENTITY_MONGO_AUTHOR_SOURCE || "admin",
        dbName: process.env.CA_IDENTITY_MONGO_DB_NAME || "auth",
        templateUri:
            "mongodb://${username}:${password}@${addresses}/${dbName}" +
            "?retryWrites=false&w=majority&authSource=${authSource}" +
            "&serverSelectionTimeoutMS=5000&connectTimeoutMS=10000" +
            "&authMechanism=SCRAM-SHA-256",
        getUri: function (): string {
            let uri = this.templateUri;
            const password = encodeURIComponent(this.password);
            const username = encodeURIComponent(this.username);
            uri = uri.replace("${username}", username);
            uri = uri.replace("${password}", password);
            uri = uri.replace("${authSource}", this.authSource);
            uri = uri.replace("${dbName}", this.dbName);
            uri = uri.replace("${addresses}", this.addresses);
            if (this.mode === "REPLICA_SET") {
                uri = `${uri}&replicaSet=${this.replicaName}`;
            }
            return uri;
        },
        checkDatabaseConfigs: function (): void {
            if (this.mode !== "STANDALONE" && this.mode !== "REPLICA_SET") {
                throw new Error(
                    "Mongodb connection mode must be STANDALONE or REPLICA_SET"
                );
            }
            if (this.mode === "REPLICA_SET" && !this.replicaName) {
                throw new Error("Mongodb replica name must not be empty");
            }
        },
    },
    log: {
        logFileEnabled: process.env.CA_IDENTITY_LOG_FILE_ENABLED || "false",
        folderLogsPath:
            process.env.CA_IDENTITY_FOLDER_LOGS_PATH ||
            `${__dirname}/../../logs`,

        logstashEnabled:
            process.env.CA_IDENTITY_LOG_LOGSTASH_ENABLED || "false",
        logstashHost: process.env.CA_IDENTITY_LOG_LOGSTASH_HOST || "127.0.0.1",
        logstashPort: process.env.CA_IDENTITY_LOG_LOGSTASH_PORT || "50001",
        logstashProtocol:
            process.env.CA_IDENTITY_LOG_LOGSTASH_PROTOCOL || "udp",
    },
};

configs.mongo.checkDatabaseConfigs();
