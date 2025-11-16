let clients = [];
let selectedClientId = null;

export function getClients() {
    return clients;
}

export function setClients(newClients) {
    clients = Array.isArray(newClients) ? newClients : [];
}

export function getSelectedClientId() {
    return selectedClientId;
}

export function setSelectedClientId(id) {
    selectedClientId = id;
}
