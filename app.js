// Allows us to read values from ".env" file.
require("dotenv").config();

// Express setup config
const express = require("express");
const app = express();
const port = 3000;

/**
 * First, copy the .env.EXAMPLE file to a .env file and fill in your values.
 */
// PingOne auth base url
const authBasePath = process.env.PINGONE_AUTH_BASE_PATH;
// PingOne environment ID
const envID = process.env.PINGONE_ENV_ID;
// PingOne client ID of the app connection
const clientID = process.env.PINGONE_CLIENT_ID;
// PingOne client secret of the app connection
const clientSecret = process.env.PINGONE_CLIENT_SECRET;
// Express app base url
const appBasePath = process.env.APP_BASE_PATH;

// The url path for the app to listen to. It should match the redirect uri.
const callbackPath = "/callback";
// Path where the user is redirected after authenticating/authorizing at PingOne
const redirectURI = appBasePath + ":" + port + callbackPath;
// Scopes specify what kind of access the client is requesting from the user.
// These are some standard OIDC scopes.
//   openid - signals an OIDC request; default resource on oauth/oidc app
// connection
// These need to be added as resources to the app connection or it will be
// ignored by the authorization server. Once that's done, you can then append
// it to your scopes variable using a whitespace to separate it from any other
// scopes.
//   profile - access to basic user info;
//   p1:read:user - access to read the user's PingOne identity's attributes (a
// PingOne - specific scope)
const scopes = "openid";
// The OAuth 2.0/OIDC grant type in the authorization request and the token
// request.
// i.e., code, authorization_code - Authorization Code;
const grantType = "authorization_code";
const responseType = "code";

// Root path presents link to trigger authorize request.
app.get("/", (req, res) => {
  // Authorize endpoint
  const path = envID + "/as/authorize";
  const authzReq = new URL(path, authBasePath);
  // Add query parameters to authorize endpoint to make the authorize request.
  authzReq.searchParams.append("response_type", responseType);
  authzReq.searchParams.append("client_id", clientID);
  authzReq.searchParams.append("scope", scopes);
  authzReq.searchParams.append("redirect_uri", redirectURI);

  // Send a link which, when clicked, will initiate the authorization request.
  res.send("<a href=" + authzReq.toString() + ">Login</a>");
});

// Callback path for when the user is redirected back to the app after
// authenticating/authorizing at PingOne
app.get(callbackPath, async (req, res) => {
  // Try to parse authorization code from the query parameters.
  const authorizationCode = req.query?.code;

  // Send error if the authorization code was not found.
  if (!authorizationCode) {
    const errorMsg =
      "Expected authorization code in query parameters.\n" + req.url;
    console.error(errorMsg);
    res.status(404).send("<a href='/'>Return home</a>");
  }

  /**
   * Set request headers.
   */
  // Content type
  const headers = new Headers();
  headers.append("Content-Type", "application/x-www-form-urlencoded");

  // Authorization header
  // Calculated as the result of base64 encoding the string
  // (clientID + ":" + clientSecret) appended to "Basic ".
  // e.g.,
  // "Basic 0123456lNzQtZT3Mi00ZmM0WI4ZWQtY2Q5NTMwTE0123456=="
  const authzHeader =
    "Basic " + Buffer.from(clientID + ":" + clientSecret).toString("base64");
  headers.append("Authorization", authzHeader);

  // Use URLSearchParams because we're using
  // "application/x-www-form-urlencoded".
  const urlBodyParams = new URLSearchParams();
  // The grant type is the OAuth 2.0/OIDC grant type that the PingOne app
  // connection is configured to accept. This example is set up for
  // Authorization Code.
  urlBodyParams.append("grant_type", grantType);
  // Include the authorization code that was extracted from the url when the
  // user was redirected back to the app from PingOne.
  urlBodyParams.append("code", authorizationCode);
  // The redirect_uri is where the user will be redirected with the
  // authorization code. It must be registered with PingOne by configuring the
  // app connection.
  urlBodyParams.append("redirect_uri", redirectURI);

  // Options to supply the fetch function.
  const requestOptions = {
    method: "POST",
    headers: headers,
    body: urlBodyParams,
    // redirect: "follow",
  };

  // PingOne token endpoint
  const tokenEndpoint = authBasePath + "/" + envID + "/as/token";

  // Make the exchange for tokens by calling the /token endpoint and sending the
  // authorization code.
  try {
    // Send the token request and get the response body in JSON.
    const response = await fetch(tokenEndpoint, requestOptions);
    const result = await response.json();

    // For demoing purposes, forward the json response from the token endpoint.
    res.status(200).json(result);
  } catch (error) {
    // Handle error

    // For demoing purposes, log the error to the server console and send the
    // error as a response.
    console.log(error);
    res.status(500).send(error);
  }
});

// Console message when server is ready.
app.listen(port, () => {
  console.log(
    `App listening on port ${port}. Navigate to ${appBasePath} in a browser.`
  );
});
