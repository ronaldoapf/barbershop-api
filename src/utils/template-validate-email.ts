export const templateValidateEmail = (name: string, verifyEmailUrl: string) => `
  <div>
    <h1>Hello, ${name}!</h1>
    <p>Please click the button below to verify your email address:</p>
    <a href="${verifyEmailUrl}">Verify your email</a>
  </div>
`