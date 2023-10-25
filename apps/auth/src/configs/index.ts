import "dotenv/config";

export const configs = {
    service: "auth",
    environment: process.env.CA_AUTH_ENVIRONMENT || "dev",
    frontendUrl: process.env.CA_AUTH_FRONTEND_URL || "http://127.0.0.1:3000",
    kafka: {
        broker: process.env.CA_AUTH_BROKER_KAFKA,
        username: process.env.CA_AUTH_USERNAME_KAFKA,
        password: process.env.CA_AUTH_PASSWORD_KAFKA,
    },
    app: {
        prefix: "/api/v1",
        host: process.env.CA_AUTH_HOST_NAME || "0.0.0.0",
        port: process.env.CA_AUTH_PORT_NUMBER || "6801",
    },
    mongo: {
        mode: process.env.CA_AUTH_MONGO_MODE || "STANDALONE",
        replicaName: process.env.CA_AUTH_MONGO_REPLICA_NAME || "rs0",
        addresses: process.env.CA_AUTH_MONGO_ADDRESSES || "127.0.0.1:27001",
        username: process.env.CA_AUTH_MONGO_USERNAME || "root",
        password: process.env.CA_AUTH_MONGO_PASSWORD || "",
        authSource: process.env.CA_AUTH_MONGO_AUTHOR_SOURCE || "admin",
        dbName: process.env.CA_AUTH_MONGO_DB_NAME || "auth",
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
        host: process.env.CA_AUTH_REDIS_HOST || "127.0.0.1",
        port: process.env.CA_AUTH_REDIS_PORT || "6380",
        username: process.env.CA_AUTH_REDIS_USERNAME || "",
        password: process.env.CA_AUTH_REDIS_PASSWORD || "",
    },
    keys: {
        secret: process.env.CA_AUTH_SECRET_KEY || "",
        public: process.env.CA_AUTH_PUBLIC_KEY || "",
        checkSecretKeyPublicKey: function (): void {
            if (!this.secret) {
                throw new Error("Missing secret key in environment variable");
            }
            if (!this.public) {
                throw new Error("Missing public key in environment variable");
            }
        },
    },
    log: {
        logFileEnabled: process.env.CA_AUTH_LOG_FILE_ENABLED || "false",
        folderLogsPath:
            process.env.CA_AUTH_FOLDER_LOGS_PATH || `${__dirname}/../../logs`,

        logstashEnabled: process.env.CA_AUTH_LOG_LOGSTASH_ENABLED || "false",
        logstashHost: process.env.CA_AUTH_LOG_LOGSTASH_HOST || "127.0.0.1",
        logstashPort: process.env.CA_AUTH_LOG_LOGSTASH_PORT || "50001",
        logstashProtocol: process.env.CA_AUTH_LOG_LOGSTASH_PROTOCOL || "udp",
    },
    saltRounds: process.env.CA_AUTH_SALT_ROUNDS || "10",
    adfs: {
        regex: process.env.CA_AUTH_REGEX,
    },
    services: {
        ad: {
            prefix: process.env.CA_AUTH_AD_SERVICE_PREFIX || "/",
            host: process.env.CA_AUTH_AD_SERVICE_HOST || "http://127.0.0.1",
            port: process.env.CA_AUTH_AD_SERVICE_PORT || "6809",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        keycloak: {
            client_secret:
                process.env.CA_AUTH_CLIENT_SECRET_CLOAK_SERVICE_PREFIX,
            prefix:
                process.env.CA_AUTH_KEY_CLOAK_SERVICE_PREFIX ||
                "/realms/tuanbh/protocol/openid-connect/token/",
            host:
                process.env.CA_AUTH_KEY_CLOAK_SERVICE_HOST ||
                "http://10.14.171.10",
            port: process.env.CA_AUTH_KEY_CLOAK_SERVICE_PORT || "8082",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        tenant: {
            prefix: process.env.CA_AUTH_TENANT_SERVICE_PREFIX || "/api/v1/in",
            host: process.env.CA_AUTH_TENANT_SERVICE_HOST || "http://127.0.0.1",
            port: process.env.CA_AUTH_TENANT_SERVICE_PORT || "6804",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        mail: {
            prefix:
                process.env.CA_AUTH_MAIL_SERVICE_PREFIX || "/api/v1/in/mail",
            host: process.env.CA_AUTH_MAIL_SERVICE_HOST || "http://127.0.0.1",
            port: process.env.CA_AUTH_MAIL_SERVICE_PORT || "6803",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        file: {
            prefix:
                process.env.CA_AUTH_FILE_SERVICE_PREFIX || "/api/v1/in/files",
            host: process.env.CA_AUTH_FILE_SERVICE_HOST || "http://127.0.0.1",
            port: process.env.CA_AUTH_FILE_SERVICE_PORT || "6807",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
        role: {
            prefix:
                process.env.CA_AUTH_ROLE_SERVICE_PREFIX || "/api/v1/in/roles",
            host: process.env.CA_AUTH_ROLE_SERVICE_HOST || "http://127.0.0.1",
            port: process.env.CA_AUTH_ROLE_SERVICE_PORT || "6813",
            getUrl: function (): string {
                return `${this.host}:${this.port}${this.prefix}`;
            },
        },
    },
};

configs.keys.checkSecretKeyPublicKey();
configs.mongo.checkDatabaseConfigs();
