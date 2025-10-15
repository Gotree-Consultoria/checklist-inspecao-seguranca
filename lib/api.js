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
    const url = `${API_BASE_URL}/inspection-reports${search?('?'+search):''}`;
    const resp = await fetch(url, { headers: authHeaders() });
    if (!resp.ok) throw new Error('Falha ao buscar inspection reports');
    return resp.json();
}

export async function fetchReportPdf(reportId) {
    const resp = await fetch(`${API_BASE_URL}/reports/download/${encodeURIComponent(reportId)}`, { headers: authHeaders() });
    return resp;
}

export async function deleteInspectionReport(reportId) {
    if (!reportId) throw new Error('reportId ausente');
    const resp = await fetch(`${API_BASE_URL}/inspection-reports/${encodeURIComponent(reportId)}`, {
        method: 'DELETE',
        headers: { ...authHeaders() }
    });
    return resp;
}

export default { API_BASE_URL, authHeaders, loginUser, fetchCompanies, postCompany, postInspectionReport, fetchInspectionReports, fetchReportPdf, deleteInspectionReport };
