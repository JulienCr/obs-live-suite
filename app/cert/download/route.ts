import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  // rootCA.pem is copied to project root by setup-https.js
  const rootCaPath = path.join(process.cwd(), "rootCA.pem");

  if (!fs.existsSync(rootCaPath)) {
    return NextResponse.json(
      {
        error: "Root CA certificate not found",
        hint: 'Run "node scripts/setup-https.js" to generate certificates',
      },
      { status: 404 }
    );
  }

  // Read the certificate file
  const certContent = fs.readFileSync(rootCaPath);

  // Return with proper headers for mobile installation
  return new NextResponse(certContent, {
    status: 200,
    headers: {
      "Content-Type": "application/x-x509-ca-cert",
      "Content-Disposition": 'attachment; filename="rootCA.crt"',
    },
  });
}
