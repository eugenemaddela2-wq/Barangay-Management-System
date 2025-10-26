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

        function loadDocuments() {
            const currentUser = localStorage.getItem('currentUser');
            const documentsKey = `documents_${currentUser}`;
            const documents = JSON.parse(localStorage.getItem(documentsKey) || '[]');
            const tableBody = document.getElementById('documentsTable');
            
            tableBody.innerHTML = '';
            
            if (documents.length === 0) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td colspan="5" style="text-align: center; color: #f0f0f0; font-style: italic;">
                        No document requests found.
                    </td>
                `;
                tableBody.appendChild(row);
                return;
            }
            
            documents.forEach(docRecord => {
                const row = document.createElement('tr');
                const statusColor = getStatusColor(docRecord.status);
                
                row.innerHTML = `
                    <td>REQ-${String(docRecord.id).slice(-6)}</td>
                    <td>${docRecord.type}</td>
                    <td>${docRecord.purpose}</td>
                    <td>${docRecord.date}</td>
                    <td><span style="color: ${statusColor};">${docRecord.status}</span></td>
                `;
                tableBody.appendChild(row);
            });
        }

        function getStatusColor(status) {
            switch(status) {
                case 'Pending': return '#ffd700';
                case 'Processing': return '#4fc3dc';
                case 'Ready for Pickup': return '#26d07c';
                case 'Completed': return '#90ee90';
                default: return '#f0f0f0';
            }
        }

        function requestDocument() {
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
                status: 'Pending'
            };

            if (!docRecord.type || !docRecord.purpose) {
                alert('Please fill in all fields.');
                return;
            }

            const documentsKey = `documents_${currentUser}`;
            const documents = JSON.parse(localStorage.getItem(documentsKey) || '[]');
            documents.push(docRecord);
            localStorage.setItem(documentsKey, JSON.stringify(documents));
            
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
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('userLoggedIn');
                localStorage.removeItem('currentUser');
                alert('Logged out successfully!');
                window.location.href = 'login.html';
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