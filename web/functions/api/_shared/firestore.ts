// Read-only Firestore REST client. Always forwards the caller's own Firebase
// ID token — never a service-account/admin token — so every read is
// evaluated against firestore.rules for that user, same as the client SDK.
// (No service account key is available in this environment; see the
// migration plan for why writes to Firestore are never done server-side.)

type FirestoreValue = Record<string, unknown>;

function decodeValue(value: any): unknown {
  if (value == null) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map(decodeValue);
  if ("mapValue" in value) return decodeFields(value.mapValue.fields ?? {});
  return null;
}

function decodeFields(fields: Record<string, any>): FirestoreValue {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}

function decodeDocument(doc: { name: string; fields?: Record<string, any> }): FirestoreValue {
  const id = doc.name.split("/").pop() ?? "";
  return { id, ...decodeFields(doc.fields ?? {}) };
}

function baseUrl(projectId: string) {
  return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
}

export async function getDoc(
  projectId: string,
  idToken: string,
  path: string,
): Promise<FirestoreValue | null> {
  const response = await fetch(`${baseUrl(projectId)}/${path}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Firestore getDoc failed: ${response.status}`);

  return decodeDocument(await response.json());
}

export async function listDocs(
  projectId: string,
  idToken: string,
  collectionPath: string,
): Promise<FirestoreValue[]> {
  const response = await fetch(`${baseUrl(projectId)}/${collectionPath}?pageSize=300`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!response.ok) throw new Error(`Firestore listDocs failed: ${response.status}`);

  const data = (await response.json()) as { documents?: any[] };
  return (data.documents ?? []).map(decodeDocument);
}
