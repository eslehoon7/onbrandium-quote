import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, Send, Edit3, User, Briefcase, CreditCard, MapPin, CheckCircle, Settings, Link as LinkIcon
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Constants
const PACKAGES = [
  { id: 'landing', name: '랜딩페이지 패키지', price: 330000 },
  { id: 'corporate', name: '기업 홈페이지 패키지', price: 590000 },
  { id: 'brand', name: '브랜드 홈페이지 패키지', price: 990000 },
];

const SUB_PAGE_PRICE = 70000;

const AUTOMATIONS = [
  { id: 'email', name: '이메일 자동 알림 연동', price: 0 },
  { id: 'sheets', name: '구글 스프레드시트 DB 연동', price: 150000 },
  { id: 'slack', name: '슬랙(Slack) 실시간 알림 연동', price: 100000 },
];

function App() {
  // UI States
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(true);

  // Calculation States
  const [selectedPackageId, setSelectedPackageId] = useState('landing');
  const [subPages, setSubPages] = useState(1);
  const [selectedAutomations, setSelectedAutomations] = useState(['email']);
  const [discountRate, setDiscountRate] = useState(50);
  
  // Custom Content States
  const [customerName, setCustomerName] = useState('고객님 귀하');
  const [customerAddress, setCustomerAddress] = useState('고객님 주소');
  const [projectTitle, setProjectTitle] = useState('명동냉동고렌탈 홈페이지 구축');
  const [bankInfo, setBankInfo] = useState('카카오뱅크 7979-81-98208 (예금주: 온브랜디움 코리아)');

  // URL에서 초기 상태 복원
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const data = params.get('q');
    if (data) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(data))));
        if (decoded.p) setSelectedPackageId(decoded.p);
        if (decoded.s) setSubPages(decoded.s);
        if (decoded.d) setDiscountRate(decoded.d);
        if (decoded.n) setCustomerName(decoded.n);
        if (decoded.a) setCustomerAddress(decoded.a);
        if (decoded.pt) setProjectTitle(decoded.pt);
        if (decoded.b) setBankInfo(decoded.b);
        if (decoded.am) setSelectedAutomations(decoded.am);
        setIsControlPanelOpen(false); // 링크로 온 경우 설정창 닫기
      } catch (e) {
        console.error('링크 데이터를 읽는 중 오류가 발생했습니다.', e);
      }
    }
  }, []);

  // 공유 링크 생성
  const handleCopyShareLink = () => {
    const data = {
      p: selectedPackageId,
      s: subPages,
      d: discountRate,
      n: customerName,
      a: customerAddress,
      pt: projectTitle,
      b: bankInfo,
      am: selectedAutomations
    };
    // 유니코드 대응 btoa
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    const url = `${window.location.origin}${window.location.pathname}?q=${encoded}`;
    
    navigator.clipboard.writeText(url).then(() => {
      alert('공유용 견적 링크가 클립보드에 복사되었습니다. 상대방에게 전달해 보세요!');
    });
  };

  const invoiceRef = useRef(null);

  const packageItem = useMemo(() => PACKAGES.find(p => p.id === selectedPackageId), [selectedPackageId]);
  const subtotal = packageItem.price + (subPages * SUB_PAGE_PRICE) + 
    AUTOMATIONS.filter(a => selectedAutomations.includes(a.id)).reduce((sum, a) => sum + a.price, 0);
  const discountAmount = Math.round(subtotal * (discountRate / 100));
  const finalPrice = subtotal - discountAmount;

  const formatPrice = (price) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(price);

  const handleDownloadPDF = async () => {
    const element = invoiceRef.current;
    const canvas = await html2canvas(element, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    // 파일명 설정: [프로젝트명]_온브랜디움.pdf
    const fileName = `${projectTitle.replace(/[\/\\?%*:|"<>]/g, '_')}_온브랜디움.pdf`;
    pdf.save(fileName);
  };

  return (
    <div style={{ paddingBottom: '100px', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      
      {/* 🛠 상단 컨트롤 패널 */}
      <AnimatePresence>
        {isControlPanelOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="controls-panel overflow-hidden" 
            style={{ position: 'sticky', top: 0, zIndex: 100, marginBottom: '20px', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}
          >
            <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Edit3 size={16} className="text-coral" /> 상세 견적 조건 설정
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-2">
              {/* 견적 관련 설정 */}
              <div className="space-y-4">
                <div className="control-group">
                  <label>패키지 선택</label>
                  <select value={selectedPackageId} onChange={(e) => setSelectedPackageId(e.target.value)}>
                    {PACKAGES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="flex gap-4">
                  <div className="control-group flex-1">
                    <label>서브 페이지 수</label>
                    <input type="number" min="1" value={subPages} onChange={(e) => setSubPages(parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="control-group flex-1">
                    <label>할인율 (%)</label>
                    <input type="number" min="0" max="100" value={discountRate} onChange={(e) => setDiscountRate(parseInt(e.target.value) || 0)} />
                  </div>
                </div>
              </div>

              {/* 텍스트 설정 1 */}
              <div className="space-y-4">
                <div className="control-group">
                  <label className="flex items-center gap-1"><User size={12}/> 수신인 명칭</label>
                  <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div className="control-group">
                  <label className="flex items-center gap-1"><MapPin size={12}/> 수신인 주소</label>
                  <input type="text" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} />
                </div>
              </div>

              {/* 텍스트 설정 2 */}
              <div className="space-y-4">
                <div className="control-group">
                  <label className="flex items-center gap-1"><Briefcase size={12}/> 프로젝트명</label>
                  <input type="text" value={projectTitle} onChange={(e) => setProjectTitle(e.target.value)} />
                </div>
                <div className="control-group">
                  <label className="flex items-center gap-1"><CreditCard size={12}/> 계좌 정보</label>
                  <input 
                    type="text"
                    value={bankInfo} 
                    onChange={(e) => setBankInfo(e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* 자동화 옵션을 전체 너비로 이동 */}
            <div className="control-group mb-6">
              <label>자동화 옵션</label>
              <div className="flex flex-wrap items-center gap-x-20 gap-y-2 mt-2">
                {AUTOMATIONS.map(a => (
                  <label key={a.id} className="inline-flex items-center text-[13px] font-medium cursor-pointer whitespace-nowrap">
                    <input 
                      type="checkbox" 
                      checked={selectedAutomations.includes(a.id)} 
                      disabled={a.id === 'email'}
                      onChange={() => setSelectedAutomations(prev => prev.includes(a.id) ? prev.filter(i => i !== a.id) : [...prev, a.id])}
                      className="mr-2 w-4 h-4"
                    />
                    {a.name}
                  </label>
                ))}
              </div>
            </div>

            {/* 하단 버튼 영역 */}
            <div className="flex justify-end pt-6 border-top border-gray-700">
              <button 
                onClick={() => setIsControlPanelOpen(false)}
                className="btn-action btn-coral" 
                style={{ padding: '12px 30px', fontSize: '15px', borderRadius: '10px' }}
              >
                <CheckCircle size={18} className="mr-2" /> 설정 완료 및 닫기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isControlPanelOpen && (
        <div className="max-w-[1000px] mx-auto pt-4 flex justify-end px-10 no-print">
          <button 
            onClick={() => setIsControlPanelOpen(true)}
            className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-coral transition-colors py-2 px-4 bg-white rounded-lg shadow-sm border border-gray-200"
          >
            <Settings size={14} /> 상세 견적 조건 다시 수정하기
          </button>
        </div>
      )}

      {/* 📄 실제 견적서 영역 */}
      <div className="invoice-container no-pdf-print-fix" ref={invoiceRef} style={{ margin: '20px auto' }}>
        <div className="invoice-header">
          <div className="logo-section">
            <h1 className="flex items-center">
              <img src="/logo.png" alt="온브랜디움" style={{ height: '40px', marginRight: '12px' }} />
              온브랜디움(ONBRANDIUM)
            </h1>
            <p className="text-[10px] text-muted mt-2">PREMIUM DIGITAL BRANDING & TRANSFORMATION SERVICES</p>
          </div>
          <div className="invoice-box" style={{ fontSize: '24px', padding: '120px 40px 30px 40px', marginTop: '0px', display: 'flex', alignItems: 'flex-end' }}>견 적 서</div>
        </div>

        <div className="info-section">
          <div className="office-address">
            <h4 className="info-title">본사 주소 (OFFICE ADDRESS)</h4>
            <p>경기도 평택시 중앙로 121<br />T. 010-7109-1921</p>
          </div>
          <div className="to-section text-right">
            <h4 className="info-title text-right">수신 (TO:)</h4>
            <p><strong>{customerName}</strong><br />{customerAddress}</p>
          </div>
        </div>

        <div className="info-section" style={{ borderTop: '1px solid #eee', paddingTop: '20px' }}>
          <div style={{ padding: '10px 0' }}>
             <h4 className="info-title" style={{ marginBottom: '8px' }}>프로젝트 (PROJECT):</h4>
             <p style={{ fontSize: '24px', fontWeight: '900', color: '#1a1a1a' }}>{projectTitle}</p>
          </div>
          <div className="text-right">
            <p>견적 번호: #OB-{Math.floor(Math.random() * 1000000)}</p>
            <p>견적 일자: {new Date().toLocaleDateString('ko-KR')}</p>
            <p>고객 번호: 2026-OB</p>
          </div>
        </div>

        <table className="invoice-table">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>번호</th>
              <th>세부 항목 명칭</th>
              <th style={{ width: '150px' }}>단 가</th>
              <th style={{ width: '80px' }}>수량</th>
              <th style={{ width: '150px' }} className="text-right">합 계</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1.</td>
              <td>{packageItem.name}</td>
              <td>{formatPrice(packageItem.price)}</td>
              <td>1</td>
              <td className="text-right">{formatPrice(packageItem.price)}</td>
            </tr>
            <tr>
              <td>2.</td>
              <td>서브 페이지 추가</td>
              <td>{formatPrice(SUB_PAGE_PRICE)}</td>
              <td>{subPages}</td>
              <td className="text-right">{formatPrice(subPages * SUB_PAGE_PRICE)}</td>
            </tr>
            {AUTOMATIONS.filter(a => selectedAutomations.includes(a.id)).map((a, index) => (
              <tr key={a.id}>
                <td>{index + 3}.</td>
                <td>{a.name}</td>
                <td>{formatPrice(a.price)}</td>
                <td>1</td>
                <td className="text-right">{formatPrice(a.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="total-section" style={{ justifyContent: 'flex-end' }}>
          <div className="summary-table">
            <div className="summary-row">
              <span>공급 가액 소계:</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="summary-row">
              <span>특별 할인 적용 ({discountRate}%):</span>
              <span>- {formatPrice(discountAmount)}</span>
            </div>
            <div className="summary-row">
              <span>부 가 세 (VAT):</span>
              <span>₩0</span>
            </div>
            <div className="summary-row grand-total" style={{ fontSize: '18px', borderTop: '2px solid var(--brand-red)', paddingTop: '10px' }}>
              <span>최종 합계 금액:</span>
              <span>{formatPrice(finalPrice)}</span>
            </div>
          </div>
        </div>

        <div className="signature-area" style={{ marginTop: '80px' }}>
          <p className="text-[14px] mb-4">위와 같이 견적서를 제출합니다.</p>
          <div className="signature-line" style={{ width: '250px', fontSize: '14px' }}>온브랜디움 대표 (인)</div>
        </div>

        <div className="invoice-footer">
          <div className="footer-col">
            <h4>문의 사항 (Questions?)</h4>
            <p>이메일: eslehoon@naver.com<br />고객센터: 010-7109-1921<br />카카오톡: @onbrandium</p>
          </div>
          <div className="footer-col">
            <h4>입금 계좌 정보 (Payment Info)</h4>
            <p style={{ whiteSpace: 'pre-line' }}>{bankInfo.replace('(예금주:', '\n(예금주:')}</p>
          </div>
          <div className="footer-col">
            <h4>이용 안내 및 약관</h4>
            <p>본 견적은 작성일로부터 14일간 유효하며, 제작 범위 확정 시 최종 계약금이 산정됩니다.</p>
          </div>
        </div>
      </div>

      {/* 하단 고정 액션 버튼 */}
      <div className="flex justify-center gap-4 mt-12 no-print" style={{ position: 'sticky', bottom: '20px', zIndex: 100 }}>
        <button onClick={handleCopyShareLink} className="btn-action" style={{ background: '#333', color: 'white', padding: '15px 30px', borderRadius: '50px', fontWeight: '800', display: 'flex', alignItems: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
          <LinkIcon size={18} className="mr-2" /> 공유 링크 복사 (URL)
        </button>
        <button onClick={handleDownloadPDF} className="btn-action" style={{ background: 'var(--brand-yellow)', color: '#000', padding: '15px 30px', borderRadius: '50px', fontWeight: '800', display: 'flex', alignItems: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
          <Download size={18} className="mr-2" /> 견적서 PDF 다운로드
        </button>
      </div>
    </div>
  );
}

export default App;
