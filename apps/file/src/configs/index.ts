import "dotenv/config";

export const configs = {
    service: "file",
    environment: process.env.CA_FILE_ENVIRONMENT || "dev",
    app: {
        prefix: "/api/v1",
        host: process.env.CA_FILE_HOST_NAME || "0.0.0.0",
        port: process.env.CA_FILE_PORT_NUMBER || "6806",
    },
    mongo: {
        mode: process.env.CA_FILE_MONGO_MODE || "STANDALONE",
        replicaName: process.env.CA_FILE_MONGO_REPLICA_NAME || "rs0",
        addresses: process.env.CA_FILE_MONGO_ADDRESSES || "127.0.0.1:27001",
        username: process.env.CA_FILE_MONGO_USERNAME || "root",
        password: process.env.CA_FILE_MONGO_PASSWORD || "",
        authSource: process.env.CA_FILE_MONGO_AUTHOR_SOURCE || "admin",
        dbName: process.env.CA_FILE_MONGO_DB_NAME || "file",
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
    keys: {
        public: process.env.CA_FILE_PUBLIC_KEY || "",
        checkPublicKey: function (): void {
            if (!this.public) {
                throw new Error("Missing public key in environment variable");
            }
        },
    },
    log: {
        logFileEnabled: process.env.CA_FILE_LOG_FILE_ENABLED || "true",
        folderLogsPath:
            process.env.CA_FILE_FOLDER_LOGS_PATH || `${__dirname}/../../logs`,

        logstashEnabled: process.env.CA_FILE_LOG_LOGSTASH_ENABLED || "false",
        logstashHost: process.env.CA_FILE_LOG_LOGSTASH_HOST || "127.0.0.1",
        logstashPort: process.env.CA_FILE_LOG_LOGSTASH_PORT || "50001",
        logstashProtocol: process.env.CA_FILE_LOG_LOGSTASH_PROTOCOL || "udp",
    },
    minio: {
        privateHost: process.env.CA_FILE_MINIO_PRIVATE_HOST || "127.0.0.1",
        privatePort: process.env.CA_FILE_MINIO_PRIVATE_PORT || "9000",
        privateSsl: process.env.CA_FILE_MINIO_PRIVATE_SSL || "false",

        publicHost: process.env.CA_FILE_MINIO_PUBLIC_HOST,
        publicPort: process.env.CA_FILE_MINIO_PUBLIC_PORT,
        publicSsl: process.env.CA_FILE_MINIO_PUBLIC_SSL,

        access: process.env.CA_FILE_MINIO_ACCESS_KEY || "",
        secret: process.env.CA_FILE_MINIO_SECRET_KEY || "",
        bucket: process.env.CA_FILE_MINIO_BUCKET || "ca-file",
        uploadExpiredTime:
            process.env.CA_FILE_MINIO_UPLOAD_EXPIRED_TIME || "900", // 15 * 60 ~ 15m
        downloadExpiredTime:
            process.env.CA_FILE_MINIO_DOWNLOAD_EXPIRED_TIME || "3600", // 60 * 60 ~ 1h
    },
    redis: {
        host: process.env.CA_FILE_REDIS_HOST || "127.0.0.1",
        port: process.env.CA_FILE_REDIS_PORT || "6380",
        username: process.env.CA_FILE_REDIS_USERNAME || "",
        password: process.env.CA_FILE_REDIS_PASSWORD || "",
    },
    services: {
        role: {
            prefix:
                process.env.CA_FILE_ROLE_SERVICE_PREFIX || "/api/v1/in/roles",
            host: process.env.CA_FILE_ROLE_SERVICE_HOST || "http://127.0.0.1",
            port: process.env.CA_FILE_ROLE_SERVICE_PORT || "6813",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
    },
};

configs.mongo.checkDatabaseConfigs();
configs.keys.checkPublicKey();
