// API helpers: centraliza chamadas fetch e headers
let API_BASE_URL;
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    API_BASE_URL = "http://localhost:8081";
} else {
    API_BASE_URL = "";
}

export function authHeaders() {
    const token = localStorage.getItem('jwtToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export async function loginUser(email, password) {
    const resp = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
    });
    return resp;
}

export async function fetchCompanies() {
    const resp = await fetch(`${API_BASE_URL}/companies`, { headers: authHeaders() });
    if (!resp.ok) throw new Error('Falha ao buscar empresas');
    return resp.json();
}

export async function postCompany(payload) {
    const resp = await fetch(`${API_BASE_URL}/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload)
    });
    return resp;
}

export async function postInspectionReport(payload) {
    const resp = await fetch(`${API_BASE_URL}/inspection-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload)
    });
    return resp;
}

export async function fetchInspectionReports(params = {}) {
    const search = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}/documents${search?('?'+search):''}`;
    const resp = await fetch(url, { headers: authHeaders() });
    if (!resp.ok) throw new Error('Falha ao buscar documentos');
    return resp.json();
}

export async function fetchReportPdf(typeSlugOrArray, reportId) {
    // Suporta tentativa com múltiplos slugs (fallback) caso o backend use nomes diferentes.
    // typeSlugOrArray pode ser string ou array de strings. Ex: ['visit','report','checklist']
    if (!reportId) throw new Error('reportId ausente');
    const types = Array.isArray(typeSlugOrArray) ? typeSlugOrArray.map(t => String(t || '')) : [String(typeSlugOrArray || '')];
    // canonical candidate slugs to try as fallback
    const canonical = ['visit','report','checklist','aep'];
    // build final list of candidates: initial provided ones first, then canonical ones not already present
    const candidates = [];
    types.forEach(t => { if (!candidates.includes(t)) candidates.push(t); });
    canonical.forEach(c => { if (!candidates.includes(c)) candidates.push(c); });
    let lastResp = null;
    // tentar sequencialmente até encontrar um response.ok com content-type PDF
    for (const tRaw of candidates) {
        const t = tRaw == null ? '' : String(tRaw);
        try {
            const resp = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(t)}/${encodeURIComponent(reportId)}/pdf`, { headers: authHeaders() });
            lastResp = resp;
            if (!resp.ok) {
                // tenta próximo
                continue;
            }
            const ct = (resp.headers.get('content-type') || '').toLowerCase();
            if (ct.includes('pdf')) {
                return resp; // sucesso
            }
            // se não for PDF, tenta próximo slug
            continue;
        } catch (err) {
            // network/CORS error - guardar e tentar próximo
            lastResp = null;
            continue;
        }
    }
    // se nenhum retorno com PDF foi obtido, retornar o último resp (pode ser uma resposta com erro)
    if (lastResp) return lastResp;
    throw new Error('Não foi possível obter PDF para os tipos solicitados.');
}

export async function deleteInspectionReport(reportId) {
    // Mantido para compatibilidade: aceita (reportId, type?)
    if (!reportId) throw new Error('reportId ausente');
    // Se for chamada com dois argumentos (reportId, type) ou se o caller passar um objeto,
    // preferir delegar para deleteDocument quando o tipo estiver disponível.
    // Nota: alguns lugares podem chamar deleteInspectionReport(id) sem tipo — nesse caso
    // usamos a rota antiga DELETE /documents/{id} para compatibilidade.
    const resp = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(reportId)}`, {
        method: 'DELETE',
        headers: { ...authHeaders() }
    });
    return resp;
}

export async function deleteDocument(type, id) {
    if (!type || !id) throw new Error('type e id são necessários para exclusão do documento');
    const resp = await fetch(`${API_BASE_URL}/documents/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { ...authHeaders() }
    });
    return resp;
}

export async function postTechnicalVisit(payload) {
    const resp = await fetch(`${API_BASE_URL}/technical-visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload)
    });
    return resp;
}

export default { API_BASE_URL, authHeaders, loginUser, fetchCompanies, postCompany, postInspectionReport, fetchInspectionReports, fetchReportPdf, deleteInspectionReport, postTechnicalVisit };

// também exportar API_BASE_URL como named export para casos que importem diretamente
export { API_BASE_URL };
