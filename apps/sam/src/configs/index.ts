import "dotenv/config";

export const configs = {
    service: "sam",
    environment: process.env.CA_SAM_ENVIRONMENT || "dev",
    app: {
        prefix: "/api/v1",
        host: process.env.CA_SAM_HOST_NAME || "0.0.0.0",
        port: process.env.CA_SAM_PORT_NUMBER || "6812",
    },
    mongo: {
        mode: process.env.CA_SAM_MONGO_MODE || "STANDALONE",
        replicaName: process.env.CA_SAM_MONGO_REPLICA_NAME || "rs0",
        addresses: process.env.CA_SAM_MONGO_ADDRESSES || "127.0.0.1:27001",
        username: process.env.CA_SAM_MONGO_USERNAME || "root",
        password: process.env.CA_SAM_MONGO_PASSWORD || "",
        authSource: process.env.CA_SAM_MONGO_AUTHOR_SOURCE || "admin",
        dbName: process.env.CA_SAM_MONGO_DB_NAME || "tenant",
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
    redis: {
        host: process.env.CA_SAM_REDIS_HOST || "127.0.0.1",
        port: process.env.CA_SAM_REDIS_PORT || "6379",
        username: process.env.CA_SAM_REDIS_USERNAME || "",
        password: process.env.CA_SAM_REDIS_PASSWORD || "",
    },
    keys: {
        public: process.env.CA_SAM_PUBLIC_KEY || "",
        checkPublicKey: function (): void {
            if (!this.public) {
                throw new Error("Missing public key in environment variable");
            }
        },
    },
    log: {
        logFileEnabled: process.env.CA_SAM_LOG_FILE_ENABLED || "false",
        folderLogsPath:
            process.env.CA_SAM_FOLDER_LOGS_PATH || `${__dirname}/../../logs`,

        logstashEnabled: process.env.CA_SAM_LOG_LOGSTASH_ENABLED || "false",
        logstashHost: process.env.CA_SAM_LOG_LOGSTASH_HOST || "127.0.0.1",
        logstashPort: process.env.CA_SAM_LOG_LOGSTASH_PORT || "50001",
        logstashProtocol: process.env.CA_SAM_LOG_LOGSTASH_PROTOCOL || "udp",
    },
    services: {
        user: {
            prefix:
                process.env.CA_SAM_USER_SERVICE_PREFIX || "/api/v1/in/users",
            host: process.env.CA_SAM_USER_SERVICE_HOST || "http://127.0.0.1",
            port: process.env.CA_SAM_USER_SERVICE_PORT || "6801",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        service: {
            prefix:
                process.env.CA_SAM_SERVICE_SERVICE_PREFIX ||
                "/api/v1/in/services",
            host: process.env.CA_SAM_SERVICE_SERVICE_HOST || "http://127.0.0.1",
            port: process.env.CA_SAM_SERVICE_SERVICE_PORT || "6804",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        request: {
            prefix:
                process.env.CA_SAM_REQUEST_SERVICE_PREFIX ||
                "/api/v1/in/request",
            host: process.env.CA_SAM_REQUEST_SERVICE_HOST || "http://127.0.0.1",
            port: process.env.CA_SAM_REQUEST_SERVICE_PORT || "6806",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        incident: {
            prefix:
                process.env.CA_SAM_INCIDENT_SERVICE_PREFIX ||
                "/api/v1/in/incident",
            host:
                process.env.CA_SAM_INCIDENT_SERVICE_HOST || "http://127.0.0.1",
            port: process.env.CA_SAM_INCIDENT_SERVICE_PORT || "6805",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        group: {
            prefix:
                process.env.CA_SAM_GROUP_SERVICE_PREFIX || "/api/v1/in/groups",
            host: process.env.CA_SAM_GROUP_SERVICE_HOST || "http://127.0.0.1",
            port: process.env.CA_SAM_GROUP_SERVICE_PORT || "6801",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        role: {
            prefix:
                process.env.CA_SAM_ROLE_SERVICE_PREFIX || "/api/v1/in/roles",
            host: process.env.CA_SAM_ROLE_SERVICE_HOST || "http://127.0.0.1",
            port: process.env.CA_SAM_ROLE_SERVICE_PORT || "6813",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        scheduler: {
            prefix: process.env.CA_SAM_SCHEDULER_SERVICE_PREFIX || "/api/v1/in",
            host:
                process.env.CA_SAM_SCHEDULER_SERVICE_HOST || "http://127.0.0.1",
            port: process.env.CA_SAM_SCHEDULER_SERVICE_PORT || "6814",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        mail: {
            prefix: process.env.CA_SAM_MAIL_SERVICE_PREFIX || "/api/v1/in/mail",
            host: process.env.CA_SAM_MAIL_SERVICE_HOST || "http://127.0.0.1",
            port: process.env.CA_SAM_MAIL_SERVICE_PORT || "6803",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
    },
};

configs.mongo.checkDatabaseConfigs();
configs.keys.checkPublicKey();
