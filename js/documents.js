 // Navigation and scroll functionality
        document.addEventListener('DOMContentLoaded', function() {
            initializeNavigation();
            loadDocuments();
            
            // Handle scroll to hide header
            let lastScrollTop = 0;
            window.addEventListener('scroll', function() {
                let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                const title = document.querySelector('.title');
                
                if (scrollTop > lastScrollTop && scrollTop > 100) {
                    title.classList.add('hidden');
                } else {
                    title.classList.remove('hidden');
                }
                lastScrollTop = scrollTop;
            });
            
            document.getElementById('documentForm').addEventListener('submit', function(e) {
                e.preventDefault();
                requestDocument();
            });
        });

        function initializeNavigation() {
            const toggleClick = document.querySelector(".toggleBox");
            const container = document.querySelector(".container");
            
            if (toggleClick && container) {
                toggleClick.addEventListener('click', (e) => {
                    e.preventDefault();
                    toggleClick.classList.toggle('active');
                    container.classList.toggle('active');
                });
            }
        }

    async function loadDocuments() {
            const currentUser = localStorage.getItem('currentUser');
            // Try to fetch from server first. If server available, use server documents filtered by resident.
            let documents = [];
            try {
                const health = await fetch('/health');
                if (health.ok) {
                    const res = await fetch('/api/documents');
                    if (res.ok) {
                        const all = await res.json();
                        documents = (all || []).filter(d => d.resident === currentUser);
                    }
                }
            } catch (err) {
                // server not available, fallback to localStorage below
            }

            // Fallback / merge: include per-user personal docs stored previously
            const personalDocsKey = `documents_${currentUser}`;
            const personalDocs = JSON.parse(localStorage.getItem(personalDocsKey) || '[]');
            const map = new Map();
            documents.forEach(d => map.set(String(d.id), d));
            personalDocs.forEach(d => { if (!map.has(String(d.id))) map.set(String(d.id), d); });
            documents = Array.from(map.values()).sort((a,b)=>a.date.localeCompare(b.date));
            const tableBody = document.getElementById('documentsTable');
            
            tableBody.innerHTML = '';
            
            if (documents.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td colspan="6" style="text-align: center; color: #f0f0f0; font-style: italic;">
                        No document requests found.
                    </td>
                `;
                tableBody.appendChild(row);
                return;
            }
            
            documents.forEach(docRecord => {
                const row = document.createElement('tr');
                const statusColor = getStatusColor(docRecord.status);
                let actionsHtml = '';
                if (docRecord.status === 'Issued') {
                    actionsHtml = `<button class="btn" onclick='printDocument(${docRecord.id})'>Print</button>`;
                }

                row.innerHTML = `
                    <td>REQ-${String(docRecord.id).slice(-6)}</td>
                    <td>${docRecord.type}</td>
                    <td>${docRecord.purpose || ''}</td>
                    <td>${docRecord.date}</td>
                    <td><span style="color: ${statusColor};">${docRecord.status || 'Pending'}</span></td>
                    <td>${actionsHtml}</td>
                `;
                tableBody.appendChild(row);
            });
        }

        function getStatusColor(status) {
            switch(status) {
                case 'Pending': return '#ffd700';
                case 'Processing': return '#4fc3dc';
                                case 'Issued': return '#2e8b57';
                case 'Ready for Pickup': return '#26d07c';
                case 'Completed': return '#90ee90';
                default: return '#f0f0f0';
            }
        }

                // Open a printable view for the document. Very small template per document type.
                function printDocument(id) {
                        const allDocs = JSON.parse(localStorage.getItem('documents') || '[]');
                        const doc = allDocs.find(d => String(d.id) === String(id));
                        if (!doc) {
                                alert('Document not found');
                                return;
                        }

                        const printWin = window.open('', '_blank');
                        const content = `
                                <html>
                                <head>
                                    <title>Print - ${doc.type}</title>
                                    <style>
                                        body { font-family: Arial, sans-serif; padding: 40px; }
                                        .header { text-align:center; margin-bottom: 30px }
                                        .content { font-size: 18px; }
                                        .label { font-weight: 700; }
                                    </style>
                                </head>
                                <body>
                                    <div class="header">
                                        <h1>Barangay Document</h1>
                                        <h2>${doc.type}</h2>
                                    </div>
                                    <div class="content">
                                        <p><span class="label">Request ID:</span> REQ-${String(doc.id).slice(-6)}</p>
                                        <p><span class="label">Resident:</span> ${doc.resident}</p>
                                        <p><span class="label">Purpose:</span> ${doc.purpose || ''}</p>
                                        <p><span class="label">Date Issued:</span> ${doc.date}</p>
                                        <p><span class="label">Status:</span> ${doc.status}</p>
                                        <hr />
                                        <p>This is an official document generated by the Barangay Management System.</p>
                                    </div>
                                    <script>
                                        window.onload = function(){ window.print(); setTimeout(()=>window.close(), 100); };
                                    <\/script>
                                </body>
                                </html>
                        `;

                        printWin.document.open();
                        printWin.document.write(content);
                        printWin.document.close();
                }

    async function requestDocument() {
            const currentUser = localStorage.getItem('currentUser');
            if (!currentUser) {
                alert('Please login first.');
                return;
            }
            
            const form = document.getElementById('documentForm');
            const formData = new FormData(form);
            
            const docRecord = {
                id: Date.now(),
                type: formData.get('type'),
                purpose: formData.get('purpose'),
                date: new Date().toLocaleDateString(),
                status: 'Pending',
                resident: currentUser
            };

            if (!docRecord.type || !docRecord.purpose) {
                alert('Please fill in all fields.');
                return;
            }

            // Try to POST to server so requests are persisted remotely. If server not reachable, fall back to localStorage.
            let serverSaved = false;
            try {
                const health = await fetch('/health');
                if (health.ok) {
                    const payload = { type: docRecord.type, resident: docRecord.resident, date: docRecord.date, status: docRecord.status };
                    const resp = await fetch('/api/documents', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    if (resp.ok) {
                        const saved = await resp.json();
                        // ensure id and other fields align with server copy
                        docRecord.id = saved.id || docRecord.id;
                        serverSaved = true;
                    }
                }
            } catch (err) {
                console.warn('Server document POST failed, saving locally', err);
            }

            // Save to per-user key for backward compatibility
            const documentsKey = `documents_${currentUser}`;
            const personalDocs = JSON.parse(localStorage.getItem(documentsKey) || '[]');
            personalDocs.push(docRecord);
            localStorage.setItem(documentsKey, JSON.stringify(personalDocs));

            // Also save to global documents list so admin can manage them
            const allDocs = JSON.parse(localStorage.getItem('documents') || '[]');
            allDocs.push(docRecord);
            localStorage.setItem('documents', JSON.stringify(allDocs));
            
            form.reset();
            loadDocuments();
            showMessage('Document request submitted successfully!');
        }

        function showMessage(message) {
            const messageDiv = document.createElement('div');
            messageDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 25px;
                background: #26d07c;
                color: white;
                border-radius: 5px;
                z-index: 10000;
                animation: slideIn 0.3s ease;
            `;
            messageDiv.textContent = message;
            
            document.body.appendChild(messageDiv);
            
            setTimeout(() => {
                messageDiv.remove();
            }, 3000);
        }

        function logout() {
            if (typeof window.__shared_logout__ === 'function') return window.__shared_logout__();
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('userLoggedIn');
                localStorage.removeItem('currentUser');
                window.location.replace('/index.html');
            }
        }

        // Add CSS animation for messages
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);