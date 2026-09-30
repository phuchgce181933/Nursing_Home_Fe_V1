/**
 * Mẫu điều khoản hợp đồng dịch vụ chăm sóc người cao tuổi
 * Viện Dưỡng Lão An Nhiên
 *
 * File này chứa nội dung điều khoản mặc định được sử dụng khi admin tạo
 * hợp đồng mới từ admission (luồng mới: Bác sĩ khám xong → Lên hợp đồng → Hóa đơn).
 *
 * Admin có thể chỉnh sửa trực tiếp trong modal trước khi tạo, hoặc bấm
 * nút "Khôi phục mẫu chuẩn" để reset về nội dung mặc định này.
 *
 * Markers đặc biệt trong nội dung hợp đồng:
 *   [CENTER] ... [/CENTER] — khối văn bản sẽ được render căn giữa, in đậm
 *       trong modal xem trước và bản in.
 *   [LOGO]                — sẽ được thay bằng <img> logo Viện Dưỡng Lão An Nhiên
 *       ở đầu trang hợp đồng (kích thước 120×120, căn giữa).
 *   {ALL_PACKAGES}        — sẽ được thay bằng danh sách các gói dịch vụ
 *       đang hoạt động trong hệ thống, kèm dấu "✓" bên cạnh gói đã chọn.
 *   {CONTRACT_NUMBER}     — số hợp đồng (fill khi tạo hợp đồng).
 *   {ROOM_TYPE}           — loại phòng thực tế đã phân bổ cho Người cao tuổi.
 */

const CONTRACT_TERMS_TEMPLATE = `[CENTER]
[LOGO]
HỢP ĐỒNG
DỊCH VỤ CHĂM SÓC NGƯỜI CAO TUỔI
TẠI CƠ SỞ DƯỠNG LÃO
[/CENTER]
[CENTER]
GIỮA
BÊN A: VIỆN DƯỠNG LÃO AN NHIÊN
VÀ
BÊN B: NGƯỜI SỬ DỤNG DỊCH VỤ / NGƯỜI ĐẠI DIỆN
[/CENTER]
[CENTER]
Số HĐ: {CONTRACT_NUMBER}
[Địa điểm], ngày ..... tháng ..... năm ........
CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập – Tự do – Hạnh phúc
———————————————
HỢP ĐỒNG DỊCH VỤ CHĂM SÓC NGƯỜI CAO TUỔI TẠI CƠ SỞ DƯỠNG LÃO
Số hợp đồng: {CONTRACT_NUMBER}
[/CENTER]

• Căn cứ Bộ luật Dân sự hiện hành và các quy định pháp luật có liên quan;
• Căn cứ nhu cầu sử dụng dịch vụ chăm sóc người cao tuổi của Bên B;
• Căn cứ khả năng cung cấp dịch vụ của Bên A;
• Căn cứ sự tự nguyện và thỏa thuận của các Bên.
Hôm nay, ngày ..... tháng ..... năm ........, tại [Địa điểm ký hợp đồng], các Bên gồm:

ĐIỀU 1. GIẢI THÍCH THUẬT NGỮ
1. "Viện" là Viện Dưỡng Lão An Nhiên – bên cung cấp dịch vụ theo Hợp đồng.
2. "Người cao tuổi" là người được tiếp nhận và chăm sóc theo Hợp đồng.
3. "Người đại diện" là người ký Hợp đồng, người có nghĩa vụ/quyền phụng dưỡng hoặc người được ủy quyền hợp pháp để thực hiện các giao dịch liên quan đến dịch vụ.
4. "Gói dịch vụ" là nhóm dịch vụ được xác định trước và tính phí theo kỳ tháng hoặc kỳ khác ghi trong Hợp đồng.
5. "Dịch vụ phát sinh" là thuốc, dịch vụ, hàng hóa hoặc khoản chi không nằm trong Gói dịch vụ.
6. "Ví dịch vụ" là số dư tiền được ghi nhận riêng cho Người cao tuổi để thanh toán các khoản phát sinh hợp lệ theo Hợp đồng.
7. "Giao dịch Ví" là việc nạp hoặc trừ các giao dịch liên quan đến Ví.
8. "Trường hợp khẩn cấp" là tình huống cần xử lý ngay để bảo vệ tính mạng, sức khỏe hoặc an toàn của Người cao tuổi, trong phạm vi pháp luật và chuyên môn cho phép.

ĐIỀU 2. THÔNG TIN CÁC BÊN

BÊN A – BÊN CUNG CẤP DỊCH VỤ
- Tên đơn vị: VIỆN DƯỠNG LÃO AN NHIÊN
- Địa chỉ: Số 47, đường D17, Khu dân cư Hồng Loan, phường Hưng Phú, Cần Thơ
- Mã số doanh nghiệp/đơn vị: 492043000050
- Người đại diện: Ông/Bà: Huỳnh Gia Phúc
- Chức vụ: Giám đốc Bệnh viện
- Điện thoại: 0905087335
- Email: phuchgce181933@fpt.edu.vn

BÊN B – NGƯỜI SỬ DỤNG DỊCH VỤ / NGƯỜI ĐẠI DIỆN
- Họ và tên Người đại diện: {REP_NAME}
- Quan hệ với Người cao tuổi: {REP_RELATION}
- CCCD/Hộ chiếu: {REP_CITIZEN_ID}
- Điện thoại: {REP_PHONE}
- Email: {REP_EMAIL}
- Địa chỉ liên hệ: {REP_ADDRESS}

NGƯỜI CAO TUỔI ĐƯỢC CHĂM SÓC (là chủ thể nhận dịch vụ theo Hợp đồng)
- Họ và tên: {ELDERLY_NAME}
- Ngày sinh: {ELDERLY_DOB}
- CCCD/Hộ chiếu: {ELDERLY_CITIZEN_ID}
- Địa chỉ trước khi vào Viện: {ELDERLY_ADDRESS}

ĐIỀU 3. THÔNG TIN CHĂM SÓC NGƯỜI CAO TUỔI
- Tình trạng sức khỏe ban đầu: {ELDERLY_HEALTH}
- Mức độ tự lập: {ELDERLY_SELF_RELIANCE}
- Dị ứng: {ELDERLY_ALLERGIES}
- Bệnh nền/thông tin cần lưu ý: {ELDERLY_CHRONIC}
- Người liên hệ khẩn cấp: {EMERGENCY_CONTACTS}

ĐIỀU 4. MỤC ĐÍCH VÀ PHẠM VI HỢP ĐỒNG
1. Viện tiếp nhận Người cao tuổi để cung cấp dịch vụ lưu trú, chăm sóc, hỗ trợ sinh hoạt và các dịch vụ liên quan theo Gói đã đăng ký.
2. Phạm vi cung cấp dịch vụ được xác định bằng Hợp đồng, Bảng mô tả Gói dịch vụ và các Phụ lục.
3. Viện chỉ thực hiện các hoạt động chuyên môn phù hợp với chức năng, điều kiện và phạm vi hoạt động hợp pháp của Viện.
4. Những dịch vụ không được ghi trong Gói hoặc Bảng giá không được mặc nhiên hiểu là đã bao gồm trong phí hàng tháng.
5. Người cao tuổi vẫn là chủ thể được chăm sóc; việc ký kết của Người đại diện không làm mất các quyền hợp pháp của Người cao tuổi.

ĐIỀU 5. TIẾP NHẬN VÀ ĐÁNH GIÁ BAN ĐẦU
1. Trước ngày tiếp nhận, Người đại diện cung cấp các thông tin cần thiết để Viện đánh giá khả năng tiếp nhận và nhu cầu chăm sóc.
2. Khi tiếp nhận, Viện lập hồ sơ gồm thông tin nhân thân, tình trạng sức khỏe, nhu cầu chăm sóc, người liên hệ, tài sản bàn giao và các thông tin cần thiết khác.
3. Nếu phát hiện thông tin sức khỏe hoặc nhu cầu chăm sóc khác đáng kể so với thông tin đã cung cấp, hai bên thống nhất phương án chăm sóc và chi phí bổ sung nếu có.
4. Viện có quyền từ chối hoặc tạm hoãn tiếp nhận nếu nhu cầu của Người cao tuổi vượt quá phạm vi chuyên môn/điều kiện mà Viện được phép cung cấp; việc từ chối phải được thông báo rõ lý do.

ĐIỀU 6. GÓI DỊCH VỤ HÀNG THÁNG
Các gói dịch vụ hiện có tại Viện (trong hệ thống):
{ALL_PACKAGES}

Gói Người cao tuổi đăng ký sử dụng theo Hợp đồng này: {PKG_NAME}; Phí: {PKG_PRICE_FULL}.

ĐIỀU 7. DỊCH VỤ ĐƯỢC BAO GỒM TRONG GÓI
1. Chi phí lưu trú tại loại phòng: {ROOM_TYPE}.
2. Chi phí vệ sinh và hỗ trợ sinh hoạt trong phạm vi Gói.
3. Hoạt động sinh hoạt, giải trí hoặc vận động phù hợp theo chương trình của Viện.
4. Theo dõi và ghi nhận tình trạng Người cao tuổi trong phạm vi dịch vụ được cung cấp.
5. Các nội dung khác được liệt kê cụ thể tại Phụ lục Gói dịch vụ.

ĐIỀU 8. DỊCH VỤ KHÔNG BAO GỒM
Các khoản sau chỉ được tính khi có căn cứ theo Bảng giá, thỏa thuận hoặc cơ chế khẩn cấp của Hợp đồng:
1. Dịch vụ hoặc hàng hóa ngoài phạm vi Gói.
2. Đồ dùng cá nhân phát sinh theo nhu cầu riêng.
3. Giặt ủi vượt định mức nếu Gói có định mức.
4. Chi phí vận chuyển hoặc đưa Người cao tuổi đến cơ sở bên ngoài khi phát sinh.
5. Dịch vụ bên thứ ba theo yêu cầu.
6. Chi phí khám, chữa bệnh, thuốc, vật tư hoặc dịch vụ y tế mà pháp luật/đơn vị cung cấp dịch vụ quy định người sử dụng phải thanh toán.
7. Các khoản khác được liệt kê tại Phụ lục Bảng giá phát sinh.

ĐIỀU 9. PHÍ DỊCH VỤ VÀ KỲ THANH TOÁN
1. Phí Gói dịch vụ: {PKG_PRICE} VNĐ/tháng.
2. Ngày bắt đầu tính phí: {CONTRACT_START}.
3. Thời hạn thanh toán: thanh toán trước ngày kết thúc của hóa đơn (Hóa đơn được lập theo kỳ tháng; Người đại diện thanh toán trước ngày kết thúc kỳ ghi trên hóa đơn).
4. Phí được thanh toán bằng tiền mặt, chuyển khoản hoặc phương thức điện tử được Viện chấp nhận.
5. Viện cung cấp thông tin về khoản phải thanh toán và chứng từ phù hợp.
6. Nếu Người cao tuổi vào/ra Viện giữa kỳ, việc tính phí theo ngày, theo tháng hoặc theo chính sách hoàn phí phải được ghi rõ tại Phụ lục giá; không áp dụng công thức chưa được thỏa thuận.

ĐIỀU 10. THAY ĐỔI GÓI DỊCH VỤ
1. Người đại diện có thể yêu cầu thay đổi Gói khi nhu cầu chăm sóc thay đổi.
2. Viện đánh giá khả năng đáp ứng và thông báo mức phí mới trước khi áp dụng.
3. Gói mới chỉ có hiệu lực từ thời điểm được hai bên xác nhận.
4. Việc thay đổi Gói không làm mất quyền của Người đại diện đối với số dư Ví, trừ các khoản đã phát sinh hợp lệ.

ĐIỀU 11. VÍ DỊCH VỤ – NGUYÊN TẮC CHUNG
1. Mỗi Người cao tuổi có một Ví dịch vụ riêng trong hệ thống/quy trình quản lý của Viện.
2. Ví được sử dụng để thanh toán các khoản phát sinh hợp lệ, không thay thế phí Gói hàng tháng.
3. Số dư Ví thuộc phạm vi đối soát giữa các bên và không được Viện sử dụng cho mục đích không liên quan đến Người cao tuổi.
4. Người đại diện có quyền biết số dư và lịch sử giao dịch.
5. Mọi giao dịch phải có căn cứ, người thực hiện và thời điểm ghi nhận.

ĐIỀU 12. NẠP TIỀN VÀO VÍ
1. Người đại diện nạp tiền theo nhu cầu, không bắt buộc phải nạp vượt quá mức cần thiết trừ khi hai bên có thỏa thuận hợp pháp khác.
2. Số tiền nạp phải được ghi nhận sau khi giao dịch thành công.
3. Nếu giao dịch bị lỗi hoặc ghi nhận sai, Viện có trách nhiệm kiểm tra và điều chỉnh theo chứng từ.
4. Người đại diện có thể yêu cầu lịch sử nạp tiền và chứng từ liên quan.

ĐIỀU 13. ĐỐI SOÁT VÍ
1. Người đại diện có quyền yêu cầu đối soát số dư và giao dịch.
2. Viện thực hiện đối soát khi có yêu cầu hoặc định kỳ: □ Hàng tháng □ Hàng quý □ Khi chấm dứt Hợp đồng.
3. Bảng đối soát tối thiểu gồm số dư đầu kỳ, tiền nạp, khoản trừ, khoản hoàn/điều chỉnh và số dư cuối kỳ.
4. Nếu có tranh chấp về một giao dịch, hai bên kiểm tra chứng từ, lịch sử hệ thống và tài liệu liên quan.

ĐIỀU 14. TRƯỜNG HỢP KHẨN CẤP VÀ CHI PHÍ KHẨN CẤP
1. Khi Người cao tuổi có dấu hiệu nguy hiểm đến tính mạng, sức khỏe hoặc an toàn, Viện được thực hiện biện pháp cần thiết trong phạm vi chuyên môn và điều kiện hoạt động hợp pháp.
2. Viện liên hệ người thân/người đại diện theo danh sách ưu tiên.
3. Nếu cần liên hệ cơ sở khám chữa bệnh hoặc đơn vị vận chuyển cấp cứu, Viện thực hiện theo quy trình phù hợp.
4. Chi phí phát sinh được xử lý theo pháp luật, thỏa thuận và Bảng giá; nếu có thể, Viện thông báo trước. Nếu không thể thông báo trước do tính chất khẩn cấp, Viện thông báo ngay khi điều kiện cho phép.
5. Viện lập ghi nhận sự kiện gồm thời gian, tình trạng, biện pháp đã thực hiện, đơn vị liên quan và thông báo cho Người đại diện.

ĐIỀU 15. CHĂM SÓC SỨC KHỎE
1. Người đại diện cung cấp thông tin chính xác về bệnh sử, dị ứng, thuốc, chế độ ăn và các yêu cầu chăm sóc.
2. Viện quản lý hồ sơ chăm sóc theo phạm vi cần thiết để cung cấp dịch vụ.
3. Viện không được hiểu Hợp đồng này là giấy phép thực hiện hoạt động khám bệnh, chữa bệnh ngoài phạm vi pháp luật cho phép.
4. Khi có thay đổi đáng kể về sức khỏe hoặc nhu cầu chăm sóc, Viện thông báo cho Người đại diện và thống nhất phương án tiếp theo.

ĐIỀU 16. QUẢN LÝ VÀ HỖ TRỢ SỬ DỤNG THUỐC
1. Người đại diện cung cấp thông tin thuốc đang sử dụng và tài liệu/chỉ định liên quan khi cần.
2. Thuốc được quản lý theo quy trình của Viện trong phạm vi được phép.
3. Việc thay đổi thuốc, liều dùng hoặc chỉ định phải dựa trên căn cứ chuyên môn phù hợp.
4. Viện ghi nhận các sự kiện liên quan đến thuốc theo quy trình quản lý.

ĐIỀU 17. KHÁM BỆNH, CHỮA BỆNH VÀ CHUYỂN CƠ SỞ Y TẾ
1. Khi Người cao tuổi cần được đánh giá hoặc điều trị ngoài phạm vi dịch vụ của Viện, Viện thông báo cho Người đại diện và phối hợp theo quy trình.
2. Người đại diện phối hợp cung cấp giấy tờ, thông tin và phương án liên hệ.
3. Chi phí của cơ sở y tế bên ngoài do bên có nghĩa vụ thanh toán theo thỏa thuận và quy định pháp luật.

ĐIỀU 18. THĂM NOM
1. Thời gian thăm: 8 giờ sáng đến 5 giờ chiều các ngày trong tuần.
2. Khách thăm thực hiện đăng ký theo quy định của Viện.
3. Khách thăm phải giữ trật tự, tôn trọng quyền riêng tư của Người cao tuổi khác và tuân thủ yêu cầu an toàn.
4. Viện có thể tạm thời điều chỉnh/hạn chế thăm trong trường hợp có căn cứ về an toàn, sức khỏe hoặc yêu cầu của cơ quan có thẩm quyền; việc điều chỉnh phải được thông báo phù hợp.

ĐIỀU 19. ĐƯA NGƯỜI CAO TUỔI RA KHỎI VIỆN
1. Người đưa Người cao tuổi ra ngoài phải thuộc danh sách người được phép hoặc có xác nhận/ủy quyền hợp lệ.
2. Trước khi rời Viện phải ghi nhận thời gian đi, người đi cùng, địa điểm đến và thời gian dự kiến trở lại.
3. Khi trở lại, Viện ghi nhận thời gian tiếp nhận và tình trạng cần lưu ý.
4. Nếu người đưa đón không có tên trong danh sách, Viện có quyền yêu cầu xác minh trước khi bàn giao để bảo đảm an toàn.

ĐIỀU 20. NỘI QUY SINH HOẠT
1. Tuân thủ thời gian ăn uống, nghỉ ngơi và hoạt động chung.
2. Tôn trọng Người cao tuổi khác, nhân viên và khách thăm.
3. Giữ vệ sinh phòng ở và khu vực chung.
4. Không tự ý vào khu vực hạn chế.
5. Không sử dụng tài sản, thiết bị của người khác khi chưa được phép.
6. Không mang vào Viện vật dụng bị cấm theo Nội quy hoặc có nguy cơ gây mất an toàn.
7. Người đại diện và khách thăm chịu trách nhiệm phối hợp để Người cao tuổi tuân thủ các quy định phù hợp với tình trạng thực tế.

ĐIỀU 21. TÀI SẢN, TIỀN VÀ TƯ TRANG
1. Tài sản được Viện nhận quản lý phải được lập biên bản, ghi rõ số lượng, tình trạng và đặc điểm nhận dạng.
2. Tài sản Người cao tuổi tự quản lý mà Viện không nhận bàn giao được xác định theo thỏa thuận và quy định pháp luật.
3. Tiền mặt/tài sản có giá trị nếu gửi Viện phải có biên bản hoặc sổ theo dõi riêng.
4. Khi chấm dứt Hợp đồng, tài sản được bàn giao lại theo danh sách đã lập.

ĐIỀU 22. BẢO VỆ THÔNG TIN CÁ NHÂN
1. Viện thu thập dữ liệu trong phạm vi cần thiết cho tiếp nhận, chăm sóc, quản lý, thanh toán, liên hệ và thực hiện nghĩa vụ pháp lý.
2. Dữ liệu sức khỏe và các dữ liệu nhạy cảm được quản lý với biện pháp bảo vệ phù hợp.
3. Viện xác định người được phép truy cập dữ liệu theo chức năng công việc.
4. Việc cung cấp dữ liệu cho bên thứ ba phải có căn cứ pháp lý phù hợp hoặc sự đồng ý hợp lệ, tùy trường hợp.
5. Người đại diện được thông báo về mục đích xử lý dữ liệu và các quyền liên quan theo quy định pháp luật.

ĐIỀU 23. HÌNH ẢNH VÀ TRUYỀN THÔNG
1. Việc sử dụng hình ảnh Người cao tuổi cho mục đích truyền thông, quảng cáo hoặc công bố công khai phải được xử lý theo quy định pháp luật và sự đồng ý phù hợp.
2. Việc sử dụng hình ảnh cho mục đích quản lý nội bộ/an toàn của Viện được thực hiện theo chính sách và căn cứ pháp lý phù hợp.

ĐIỀU 24. QUYỀN VÀ NGHĨA VỤ CỦA VIỆN
1. Cung cấp dịch vụ đúng nội dung đã cam kết.
2. Thông báo minh bạch về giá, phí và khoản phát sinh.
3. Quản lý Ví và giao dịch minh bạch, có thể kiểm tra.
4. Bảo vệ thông tin cá nhân trong phạm vi trách nhiệm.
5. Tiếp nhận và xử lý phản ánh.
6. Thông báo các sự kiện quan trọng liên quan đến Người cao tuổi theo quy trình.

ĐIỀU 25. QUYỀN VÀ NGHĨA VỤ CỦA NGƯỜI ĐẠI DIỆN
1. Cung cấp thông tin trung thực và cập nhật.
2. Thanh toán đúng hạn.
3. Phối hợp khi có vấn đề sức khỏe, cấp cứu hoặc thay đổi nhu cầu chăm sóc.
4. Tuân thủ quy định thăm nom và bàn giao.
5. Có quyền xem thông tin dịch vụ, phí, giao dịch Ví và yêu cầu đối soát.
6. Có quyền phản ánh hoặc khiếu nại khi cho rằng dịch vụ không đúng thỏa thuận.

ĐIỀU 26. XỬ LÝ VI PHẠM NỘI QUY
1. Vi phạm nội quy được xem xét dựa trên tính chất, mức độ, hậu quả và tình trạng thực tế của Người cao tuổi.
2. Viện ưu tiên nhắc nhở, trao đổi và phối hợp với Người đại diện.
3. Trường hợp có nguy cơ ảnh hưởng đến an toàn, Viện có thể áp dụng biện pháp cần thiết, phù hợp và thông báo cho Người đại diện.
4. Việc chấm dứt Hợp đồng do vi phạm phải có căn cứ cụ thể trong Hợp đồng và pháp luật; không áp dụng một cách tùy tiện.

ĐIỀU 27. ĐIỀU CHỈNH GIÁ VÀ THAY ĐỔI QUY ĐỊNH
1. Mức giá và nội dung Gói được xác định tại thời điểm ký.
2. Nếu cần thay đổi giá hoặc nội dung dịch vụ, Viện phải thông báo theo thời hạn và phương thức đã thỏa thuận, đồng thời bảo đảm quyền của Người đại diện theo pháp luật.
3. Không sử dụng điều khoản chung để cho phép Viện tự ý thay đổi các nghĩa vụ cơ bản hoặc giá đã thỏa thuận mà không có cơ chế thông báo/quyền lựa chọn phù hợp.

ĐIỀU 28. CHẤM DỨT HỢP ĐỒNG
1. Hợp đồng hết thời hạn và không gia hạn.
2. Hai bên thỏa thuận chấm dứt.
3. Người đại diện yêu cầu chấm dứt theo điều kiện Hợp đồng.
4. Viện chấm dứt theo căn cứ cụ thể của Hợp đồng và pháp luật.
5. Người cao tuổi chuyển sang cơ sở khác hoặc không còn nhu cầu sử dụng dịch vụ.
6. Các trường hợp khác theo quy định pháp luật.

ĐIỀU 29. THỜI HẠN BÁO TRƯỚC
- Người đại diện yêu cầu chấm dứt: phải thông báo trước 30 ngày (Trừ trường hợp pháp luật/thỏa thuận cho phép khác).
- Viện yêu cầu chấm dứt: phải thông báo trước 30 ngày (Phải có căn cứ và thông báo phù hợp).
- Tình huống khẩn cấp: Không áp dụng như thông thường (Xử lý an toàn trước, thông báo sau).

ĐIỀU 30. THANH LÝ VÀ BÀN GIAO
1. Hai bên xác nhận ngày chấm dứt.
2. Bàn giao Người cao tuổi cho người có thẩm quyền.
3. Bàn giao tài sản, tư trang và giấy tờ.
4. Đối soát phí Gói và công nợ.
5. Đối soát Ví.
6. Hoàn số dư Ví còn lại sau khi khấu trừ các khoản hợp lệ.
7. Ký Biên bản thanh lý.

ĐIỀU 31. KHIẾU NẠI VÀ GIẢI QUYẾT TRANH CHẤP
1. Người đại diện có thể phản ánh trực tiếp, bằng văn bản hoặc qua kênh điện tử được Viện công bố.
2. Viện xác nhận tiếp nhận trong thời hạn ……… giờ/ngày làm việc.
3. Viện cung cấp kết quả xử lý hoặc giải thích trong thời hạn ……… ngày làm việc, trừ vụ việc cần xác minh thêm.
4. Các bên ưu tiên thương lượng, hòa giải.
5. Nếu không giải quyết được, tranh chấp được giải quyết tại cơ quan có thẩm quyền theo pháp luật Việt Nam.

ĐIỀU 32. BẤT KHẢ KHÁNG
1. Sự kiện bất khả kháng được xử lý theo quy định pháp luật và mức độ ảnh hưởng thực tế.
2. Bên bị ảnh hưởng phải thông báo cho bên còn lại trong thời gian hợp lý.
3. Bất khả kháng không mặc nhiên miễn mọi nghĩa vụ thanh toán đã phát sinh trước thời điểm sự kiện.

ĐIỀU 33. HIỆU LỰC HỢP ĐỒNG
1. Hợp đồng có hiệu lực từ ngày ……/……/20…… hoặc ngày ký.
2. Các Phụ lục là bộ phận không tách rời của Hợp đồng.
3. Nếu một điều khoản bị xác định là không có hiệu lực, các phần còn lại được tiếp tục thực hiện trong phạm vi pháp luật cho phép.
4. Hợp đồng được lập thành …… bản, mỗi bên giữ …… bản có giá trị như nhau.

XÁC NHẬN CỦA CÁC BÊN
Các bên xác nhận đã đọc, được giải thích, hiểu rõ nội dung Hợp đồng, các khoản phí, cơ chế Ví dịch vụ, quyền và nghĩa vụ của mình; đồng ý ký kết trên cơ sở tự nguyện.

[CENTER]
ĐẠI DIỆN BÊN A                                              ĐẠI DIỆN BÊN B
(Ký, ghi rõ họ tên)                                       (Ký, ghi rõ họ tên)
Chức vụ: ………………………                                        Quan hệ: ………………………
Ngày ……/……/20……                                       Ngày ……/……/20……
[/CENTER]
`;

export default CONTRACT_TERMS_TEMPLATE;