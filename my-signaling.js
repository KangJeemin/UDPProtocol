// Socket.IO 클라이언트 전역 객체
// localhost 대신 현재 접속한 호스트명(IP)을 사용하도록 변경
const socket = io(`http://${window.location.hostname}:3000`);

export default {
    async request(event, data) {
        return new Promise((resolve, reject) => {
            socket.emit(event, data, (response) => {
                // 에러 처리 로직이 필요하다면 여기에 추가
                if (response && response.error) {
                    reject(response.error);
                } else {
                    resolve(response);
                }
            });
        });
    }
};
