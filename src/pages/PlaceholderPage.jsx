// đây là nơi để tránh bị lỗi trang ví dụ như tạo sildebar nhưng chưa tạo trang, hoặc tạo route nhưng chưa tạo component
// dòng này sẽ tự xuất hiện để tránh lỗi trang
function PlaceholderPage({ title }) {
  return (
    <div className="role-dashboard-card">
      <h1>{title}</h1>
      <p>Trang này đang được phát triển. Vui lòng trở về dashboard hoặc thử lại sau.</p>
    </div>
  );
}

export default PlaceholderPage;
