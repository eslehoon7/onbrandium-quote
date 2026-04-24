import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, Send, Edit3, User, Briefcase, CreditCard, MapPin, CheckCircle, Settings, Link as LinkIcon
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Constants
const PACKAGES = [
  { id: 'landing', name: '랜딩페이지 패키지', tableName: '랜딩페이지(1페이지-3섹션)', price: 330000 },
  { id: 'corporate', name: '기업 홈페이지 패키지', tableName: '기업 홈페이지(5페이지 이내)', price: 690000 },
  { id: 'brand', name: '브랜드 홈페이지 패키지', tableName: '브랜드 홈페이지 패키지(10페이지 이상)', price: 990000 },
];

const SUB_PAGE_PRICE = 80000;

const AUTOMATIONS = [
  { id: 'email', name: '이메일 자동 알림 연동', price: 100000 },
  { id: 'sheets', name: '구글 스프레드시트 DB 연동', price: 150000 },
  { id: 'slack', name: '슬랙(Slack) 실시간 알림 연동', price: 100000 },
];

function App() {
  // UI States
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(true);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Calculation States
  const [selectedPackageId, setSelectedPackageId] = useState('landing');
  const [subPages, setSubPages] = useState(1);
  const [selectedAutomations, setSelectedAutomations] = useState([]);
  const [adminPages, setAdminPages] = useState(0);
  const [adminUnitPrice, setAdminUnitPrice] = useState(0);
  const [showTopAddress, setShowTopAddress] = useState(false);
  const [showBottomInfo, setShowBottomInfo] = useState(true);
  const [discountRate, setDiscountRate] = useState(50);
  
  const [automationPrices, setAutomationPrices] = useState({
    email: 100000,
    sheets: 150000,
    slack: 100000,
  });

  const [customItemTitle, setCustomItemTitle] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState(0);
  
  // Custom Content States
  const [customerName, setCustomerName] = useState('고객님 귀하');
  const [customerAddress, setCustomerAddress] = useState('고객님 주소');
  const [projectTitle, setProjectTitle] = useState('회사명');
  const [bankInfo, setBankInfo] = useState('카카오뱅크 7979-81-98208 (예금주: 조승희)');

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
        if (decoded.ap) setAdminPages(decoded.ap);
        if (decoded.apv) setAdminUnitPrice(decoded.apv);
        if (decoded.sta !== undefined) setShowTopAddress(decoded.sta);
        if (decoded.sbi !== undefined) setShowBottomInfo(decoded.sbi);
        // 하위 호환성 (기존 링크 대응)
        if (decoded.sai !== undefined) {
          setShowTopAddress(decoded.sai);
          setShowBottomInfo(decoded.sai);
        }
        if (decoded.amv) setAutomationPrices(decoded.amv);
        if (decoded.cit) setCustomItemTitle(decoded.cit);
        if (decoded.cip) setCustomItemPrice(decoded.cip);
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
      am: selectedAutomations,
      ap: adminPages,
      apv: adminUnitPrice,
      sta: showTopAddress,
      sbi: showBottomInfo,
      amv: automationPrices,
      cit: customItemTitle,
      cip: customItemPrice
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

  const automationSubtotal = useMemo(() => 
    AUTOMATIONS.filter(a => selectedAutomations.includes(a.id))
      .reduce((sum, a) => sum + (automationPrices[a.id] || 0), 0),
    [selectedAutomations, automationPrices]
  );

  const subtotal = packageItem.price + (subPages * SUB_PAGE_PRICE) + automationSubtotal + (adminPages * adminUnitPrice) + customItemPrice;
  const discountAmount = Math.round(subtotal * (discountRate / 100));
  const finalPrice = subtotal - discountAmount;

  const formatPrice = (price) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(price);

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPDF(true);
      
      // 최상단으로 스크롤 이동 (캡처 시 잘림 방지)
      window.scrollTo(0, 0);
      
      // 스크롤 이동 후 렌더링 대기
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log('Starting PDF generation...');
      const element = invoiceRef.current;
      
      // html2canvas 옵션 최적화
      const canvas = await html2canvas(element, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      
      console.log('Canvas created:', canvas.width, 'x', canvas.height);
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; 
      const pageHeight = 295; // A4 height (leaving 2mm margin)
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // 첫 페이지 추가
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // 내용이 더 있으면 다음 페이지들 추가
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      const fileName = `${(projectTitle || '견적서').replace(/[\/\\?%*:|"<>]/g, '_')}_온브랜디움.pdf`;
      
      // '다른 이름으로 저장' 대화상자 시도 (바탕화면 등 저장 위치 직접 선택 가능)
      if (typeof window.showSaveFilePicker === 'function') {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{
              description: 'PDF Document',
              accept: { 'application/pdf': ['.pdf'] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(pdf.output('blob'));
          await writable.close();
          console.log('PDF saved via picker');
        } catch (err) {
          // 사용자가 창을 닫았거나 권한 거부 시 예외 처리
          if (err.name !== 'AbortError') {
            console.error('Picker error, falling back to default save:', err);
            pdf.save(fileName);
          }
        }
      } else {
        // 지원하지 않는 브라우저의 경우 기존 방식(다운로드 폴더)으로 저장
        pdf.save(fileName);
        console.log('PDF download triggered via default save');
      }
    } catch (e) {
      console.error('PDF 다운로드 중 오류 발생:', e);
      alert('PDF 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setIsGeneratingPDF(false);
    }
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
            className="controls-panel overflow-hidden no-print" 
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

            <div className="border-t border-gray-700/50 pt-6 mb-6">
              <label className="text-[13px] font-bold mb-4 block flex items-center gap-2">
                <Settings size={14} className="text-coral"/> 관리자 프로젝트 상세 설정 (선택사항)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                 <div className="control-group">
                    <label>관리자 페이지 수</label>
                    <input type="number" min="0" placeholder="0" value={adminPages} onChange={(e) => setAdminPages(parseInt(e.target.value) || 0)} />
                 </div>
                 <div className="control-group">
                    <label>관리자 페이지 당 단가 (₩)</label>
                    <input type="number" min="0" placeholder="0" value={adminUnitPrice} onChange={(e) => setAdminUnitPrice(parseInt(e.target.value) || 0)} />
                 </div>
                 <div className="hidden md:block"></div>
              </div>
            </div>

            <div className="border-t border-gray-700/50 pt-6 mb-6">
              <label className="text-[13px] font-bold mb-4 block flex items-center gap-2">
                <Edit3 size={14} className="text-coral"/> 기타 항목 추가 (선택사항)
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                 <div className="control-group">
                    <label>기타 항목 명칭</label>
                    <input type="text" placeholder="예: 도메인/서버 비용" value={customItemTitle} onChange={(e) => setCustomItemTitle(e.target.value)} />
                 </div>
                 <div className="control-group">
                    <label>기타 항목 단가 (₩)</label>
                    <input type="number" min="0" placeholder="0" value={customItemPrice} onChange={(e) => setCustomItemPrice(parseInt(e.target.value) || 0)} />
                 </div>
                 <div className="hidden md:block"></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 items-end">
              <div className="md:col-span-2 control-group">
                <label>자동화 옵션 설정</label>
                <div className="grid grid-cols-3 items-center gap-4 mt-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700 h-[50px]">
                  {AUTOMATIONS.map(a => (
                    <label key={a.id} className="inline-flex items-end text-[12px] font-medium cursor-pointer whitespace-nowrap text-white">
                      <input 
                        type="checkbox" 
                        checked={selectedAutomations.includes(a.id)}
                        onChange={() => setSelectedAutomations(prev => prev.includes(a.id) ? prev.filter(i => i !== a.id) : [...prev, a.id])}
                        className="mr-2 w-4 h-4 accent-logo-yellow"
                      />
                      {a.name}
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4 mt-3">
                  {AUTOMATIONS.map(a => (
                    <div key={`price-${a.id}`} className="control-group">
                      <label className="text-[10px] opacity-70 mb-1">{a.name.split(' ')[0]} 단가</label>
                      <input 
                        type="number" 
                        min="0" 
                        value={automationPrices[a.id]} 
                        onChange={(e) => setAutomationPrices(prev => ({ ...prev, [a.id]: parseInt(e.target.value) || 0 }))}
                        className="text-[12px] h-[35px]"
                        placeholder="단가 입력"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="control-group">
                <label>문서 표시 항목 설정 (ON/OFF)</label>
                <div className="grid grid-cols-1 gap-2 mt-2">
                   <label className="flex items-center p-3 bg-gray-800/50 rounded-lg border border-gray-700 cursor-pointer">
                     <input 
                       type="checkbox" 
                       checked={showTopAddress} 
                       onChange={(e) => setShowTopAddress(e.target.checked)} 
                       className="w-4 h-4 mr-2 accent-logo-yellow"
                     />
                     <span className="text-[13px] text-white font-medium">상단 본사 주소 노출</span>
                   </label>
                   <label className="flex items-center p-3 bg-gray-800/50 rounded-lg border border-gray-700 cursor-pointer">
                     <input 
                       type="checkbox" 
                       checked={showBottomInfo} 
                       onChange={(e) => setShowBottomInfo(e.target.checked)} 
                       className="w-4 h-4 mr-2 accent-logo-yellow"
                     />
                     <span className="text-[13px] text-white font-medium">하단 문의/계좌 정보 노출</span>
                   </label>
                </div>
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
            className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-coral transition-colors py-2 px-4 bg-white rounded-lg shadow-sm border border-gray-200 no-print"
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
          <div className="office-address" style={{ visibility: showTopAddress ? 'visible' : 'hidden' }}>
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
              <td>{packageItem.tableName}</td>
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
                <td>{formatPrice(automationPrices[a.id] || 0)}</td>
                <td>1</td>
                <td className="text-right">{formatPrice(automationPrices[a.id] || 0)}</td>
              </tr>
            ))}
            {adminUnitPrice > 0 && adminPages > 0 && (
              <tr>
                <td>{AUTOMATIONS.filter(a => selectedAutomations.includes(a.id)).length + 3}.</td>
                <td>관리자 페이지 구축</td>
                <td>{formatPrice(adminUnitPrice)}</td>
                <td>{adminPages}</td>
                <td className="text-right">{formatPrice(adminPages * adminUnitPrice)}</td>
              </tr>
            )}
            {customItemTitle && (
              <tr>
                <td>{AUTOMATIONS.filter(a => selectedAutomations.includes(a.id)).length + (adminUnitPrice > 0 && adminPages > 0 ? 1 : 0) + 3}.</td>
                <td>{customItemTitle}</td>
                <td>{formatPrice(customItemPrice)}</td>
                <td>1</td>
                <td className="text-right">{formatPrice(customItemPrice)}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="total-section" style={{ justifyContent: 'flex-end' }}>
          <div className="summary-table">
            <div className="summary-row">
              <span>공급 가액 소계:</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {discountRate >= 1 && (
              <div className="summary-row">
                <span>특별 할인 적용 ({discountRate}%):</span>
                <span>- {formatPrice(discountAmount)}</span>
              </div>
            )}
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
          <div className="signature-line" style={{ width: '250px', fontSize: '14px', position: 'relative' }}>
            온브랜디움 대표 
            <span style={{ position: 'relative', display: 'inline-block', marginLeft: '10px' }}>
              (인)
              <img 
                src="/signature.png" 
                alt="서명" 
                style={{ 
                  position: 'absolute', 
                  top: '50%', 
                  left: '50%', 
                  transform: 'translate(-50%, -50%)', 
                  width: '65px', 
                  height: 'auto',
                  pointerEvents: 'none',
                  mixBlendMode: 'multiply'
                }} 
              />
            </span>
          </div>
        </div>

        {showBottomInfo && (
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
        )}
      </div>

      {/* 하단 고정 액션 버튼 */}
      <div className="flex justify-center gap-4 mt-12 no-print" style={{ position: 'sticky', bottom: '20px', zIndex: 100 }}>
        <button onClick={handleCopyShareLink} className="btn-action" style={{ background: '#333', color: 'white', padding: '15px 30px', borderRadius: '50px', fontWeight: '800', display: 'flex', alignItems: 'center', boxShadow: '0 10px 20px rgba(0,0,0,0.2)' }}>
          <LinkIcon size={18} className="mr-2" /> 공유 링크 복사 (URL)
        </button>
        <button 
          onClick={handleDownloadPDF} 
          disabled={isGeneratingPDF}
          className="btn-action no-print" 
          style={{ 
            background: 'var(--brand-yellow)', 
            color: '#000', 
            padding: '15px 30px', 
            borderRadius: '50px', 
            fontWeight: '800', 
            display: 'flex', 
            alignItems: 'center', 
            boxShadow: '0 10px 20px rgba(0,0,0,0.2)',
            opacity: isGeneratingPDF ? 0.7 : 1,
            cursor: isGeneratingPDF ? 'wait' : 'pointer'
          }}
        >
          {isGeneratingPDF ? (
            <span className="flex items-center gap-2">PDF를 생성하는 중...</span>
          ) : (
            <><Download size={18} className="mr-2" /> 견적서 PDF 다운로드</>
          )}
        </button>
      </div>
    </div>
  );
}

export default App;
