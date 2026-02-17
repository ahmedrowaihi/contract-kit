import { definePluginConfig } from "@hey-api/shared";

import { handler } from "./plugin";
import type { FakerPlugin, UserConfig } from "./types";

/**
 * Default field name hints for common patterns
 * These help the plugin intelligently choose faker methods based on field names
 */
export const DEFAULT_FIELD_HINTS: FakerPlugin["Config"]["config"]["fieldNameHints"] =
  {
    // Identity
    id: "number.int",
    uuid: "string.uuid",
    guid: "string.uuid",

    // Person
    name: "person.fullName",
    firstname: "person.firstName",
    lastname: "person.lastName",
    middlename: "person.middleName",
    username: "internet.userName",
    displayname: "person.fullName",
    nickname: "internet.displayName",
    prefix: "person.prefix",
    suffix: "person.suffix",
    jobtitle: "person.jobTitle",
    title: "person.jobTitle",

    // Contact
    email: "internet.email",
    phone: "phone.number",
    phonenumber: "phone.number",
    mobile: "phone.number",

    // Address
    address: "location.streetAddress",
    street: "location.street",
    city: "location.city",
    country: "location.country",
    zipcode: "location.zipCode",
    zip: "location.zipCode",
    postalcode: "location.zipCode",
    latitude: "location.latitude",
    longitude: "location.longitude",
    lat: "location.latitude",
    lng: "location.longitude",
    lon: "location.longitude",

    // Internet
    url: "internet.url",
    website: "internet.url",
    domain: "internet.domainName",
    ip: "internet.ip",
    ipaddress: "internet.ip",
    ipv4: "internet.ipv4",
    ipv6: "internet.ipv6",
    mac: "internet.mac",
    useragent: "internet.userAgent",
    avatar: "image.avatar",
    avatarurl: "image.avatar",
    profilepicture: "image.avatar",

    // Text
    description: "lorem.paragraph",
    bio: "lorem.paragraph",
    summary: "lorem.sentence",
    content: "lorem.paragraphs",
    comment: "lorem.sentence",
    message: "lorem.sentence",
    text: "lorem.text",
    body: "lorem.paragraphs",

    // Company
    company: "company.name",
    companyname: "company.name",
    organization: "company.name",

    // Finance
    price: "commerce.price",
    amount: "number.float",
    currency: "finance.currencyCode",
    iban: "finance.iban",
    bic: "finance.bic",
    accountnumber: "finance.accountNumber",
    creditcard: "finance.creditCardNumber",

    // Date/Time
    createdat: "date.past",
    updatedat: "date.recent",
    deletedat: "date.past",
    birthdate: "date.birthdate",
    birthday: "date.birthdate",
    date: "date.past",
    timestamp: "date.past",

    // Product
    productname: "commerce.productName",
    product: "commerce.productName",
    department: "commerce.department",
    category: "commerce.department",
    sku: "string.alphanumeric",

    // Image
    image: "image.url",
    imageurl: "image.url",
    photo: "image.url",
    thumbnail: "image.url",

    // File
    filename: "system.fileName",
    filepath: "system.filePath",
    mimetype: "system.mimeType",

    // Color
    color: "color.human",
    hex: "color.rgb",

    // Status/State
    status: "helpers.arrayElement",
    state: "helpers.arrayElement",
    role: "helpers.arrayElement",
    type: "helpers.arrayElement",
  };

/**
 * Default format mapping for OpenAPI formats
 */
export const DEFAULT_FORMAT_MAPPING: FakerPlugin["Config"]["config"]["formatMapping"] =
  {
    // String formats
    email: "internet.email",
    uri: "internet.url",
    url: "internet.url",
    hostname: "internet.domainName",
    ipv4: "internet.ipv4",
    ipv6: "internet.ipv6",
    uuid: "string.uuid",

    // Date/Time formats
    "date-time": "date.recent",
    date: "date.past",
    time: "date.recent",

    // Binary
    binary: "string.alphanumeric",
    byte: "string.alphanumeric",

    // Number formats
    float: "number.float",
    double: "number.float",
    int32: "number.int",
    int64: "number.int",
  };

/**
 * Resolve user config with defaults
 */
export const resolveConfig = (
  userConfig: Partial<UserConfig>,
): FakerPlugin["Config"]["config"] => {
  return {
    output: userConfig.output ?? "factories.gen",
    fieldNameHints: {
      ...DEFAULT_FIELD_HINTS,
      ...userConfig.fieldNameHints,
    },
    formatMapping: {
      ...DEFAULT_FORMAT_MAPPING,
      ...userConfig.formatMapping,
    },
    customGenerators: userConfig.customGenerators ?? {},
    include: userConfig.include,
    exclude: userConfig.exclude,
    filter: userConfig.filter,
    generateBatchCreators: userConfig.generateBatchCreators ?? true,
    defaultBatchCount: userConfig.defaultBatchCount ?? 10,
    generateSeeder: userConfig.generateSeeder ?? false,
    respectConstraints: userConfig.respectConstraints ?? true,
    generateDocs: userConfig.generateDocs ?? true,
    includeInEntry: true,
  };
};

export const defaultConfig: FakerPlugin["Config"] = {
  config: {
    output: "factories.gen",
    fieldNameHints: DEFAULT_FIELD_HINTS,
    formatMapping: DEFAULT_FORMAT_MAPPING,
    customGenerators: {},
    generateBatchCreators: true,
    defaultBatchCount: 10,
    generateSeeder: false,
    respectConstraints: true,
    generateDocs: true,
    includeInEntry: true,
  },
  dependencies: ["@hey-api/typescript"],
  handler,
  name: "@ahmedrowaihi/openapi-ts-faker",
  tags: ["transformer"],
};

/**
 * Type helper for faker plugin, returns {@link Plugin.Config} object
 */
export const defineConfig = definePluginConfig(defaultConfig);
