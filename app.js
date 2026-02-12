/**
 * CRYPTO FUTURES TRADEMATH - OFFLINE APP
 * 100% Offline - No External Dependencies
 * Data stored in localStorage
 */

(function() {
    'use strict';

    var Storage = {
        KEY: 'crypto_futures_trademath_history',
        
        getAll: function() {
            try {
                var data = localStorage.getItem(this.KEY);
                return data ? JSON.parse(data) : [];
            } catch (e) {
                console.error('Storage read error:', e);
                return [];
            }
        },
        
        save: function(calculation) {
            try {
                var all = this.getAll();
                calculation.id = Date.now();
                calculation.createdAt = new Date().toISOString();
                all.unshift(calculation);
                localStorage.setItem(this.KEY, JSON.stringify(all));
                return calculation;
            } catch (e) {
                console.error('Storage save error:', e);
                return null;
            }
        },
        
        delete: function(id) {
            try {
                var all = this.getAll();
                var filtered = all.filter(function(c) { return c.id !== id; });
                localStorage.setItem(this.KEY, JSON.stringify(filtered));
                return true;
            } catch (e) {
                console.error('Storage delete error:', e);
                return false;
            }
        },
        
        clearAll: function() {
            try {
                localStorage.removeItem(this.KEY);
                return true;
            } catch (e) {
                console.error('Storage clear error:', e);
                return false;
            }
        }
    };

    function parseFlexibleNumber(val) {
        if (val === undefined || val === null || val === '') return 0;
        if (typeof val === 'number') return val;
        
        var s = String(val).trim();
        if (!s) return 0;

        if (s.indexOf(',') !== -1 && s.indexOf('.') !== -1) {
            var lastComma = s.lastIndexOf(',');
            var lastDot = s.lastIndexOf('.');
            if (lastComma > lastDot) {
                s = s.replace(/\./g, '').replace(',', '.');
            } else {
                s = s.replace(/,/g, '');
            }
        } else if (s.indexOf(',') !== -1) {
            var parts = s.split(',');
            if (parts.length === 2 && parts[1].length !== 3) {
                s = s.replace(',', '.');
            } else {
                s = s.replace(/,/g, '');
            }
        } else if (s.indexOf('.') !== -1) {
            var dotParts = s.split('.');
            if (dotParts.length > 2 || (dotParts.length === 2 && dotParts[1].length === 3)) {
                s = s.replace(/\./g, '');
            }
        }

        var parsed = parseFloat(s);
        return isNaN(parsed) ? 0 : parsed;
    }

    function formatNumber(num, decimals) {
        if (decimals === undefined) decimals = 2;
        return Number(num).toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    function formatPrice(num) {
        if (num >= 1) return formatNumber(num, 2);
        if (num >= 0.01) return formatNumber(num, 4);
        return formatNumber(num, 6);
    }

    var elements = {};

    function initElements() {
        elements = {
            app: document.getElementById('app'),
            loadingFallback: document.getElementById('loading-fallback'),
            
            pageCalculator: document.getElementById('page-calculator'),
            pageHistory: document.getElementById('page-history'),
            
            navHistory: document.getElementById('nav-history'),
            navBack: document.getElementById('nav-back'),
            
            totalCapital: document.getElementById('totalCapital'),
            maxRisk: document.getElementById('maxRisk'),
            leverage: document.getElementById('leverage'),
            entryPrice: document.getElementById('entryPrice'),
            stopLoss: document.getElementById('stopLoss'),
            takeProfit: document.getElementById('takeProfit'),
            
            tradeDirection: document.getElementById('trade-direction'),
            longBox: document.getElementById('long-box'),
            shortBox: document.getElementById('short-box'),
            
            warningBanner: document.getElementById('warning-banner'),
            warningText: document.getElementById('warning-text'),
            emptyState: document.getElementById('empty-state'),
            resultsGrid: document.getElementById('results-grid'),
            
            statPosition: document.getElementById('stat-position'),
            statPositionSub: document.getElementById('stat-position-sub'),
            statMargin: document.getElementById('stat-margin'),
            statMarginSub: document.getElementById('stat-margin-sub'),
            statRisk: document.getElementById('stat-risk'),
            statRiskSub: document.getElementById('stat-risk-sub'),
            statProfit: document.getElementById('stat-profit'),
            statProfitSub: document.getElementById('stat-profit-sub'),
            statRr: document.getElementById('stat-rr'),
            statRrSub: document.getElementById('stat-rr-sub'),
            statRoe: document.getElementById('stat-roe'),
            statRoeSub: document.getElementById('stat-roe-sub'),
            statLiqIsolatedValue: document.getElementById('stat-liq-isolated-value'),
            statLiqIsolatedSub: document.getElementById('stat-liq-isolated-sub'),
            statLiqCrossValue: document.getElementById('stat-liq-cross-value'),
            statLiqCrossSub: document.getElementById('stat-liq-cross-sub'),
            
            btnResetMobile: document.getElementById('btn-reset-mobile'),
            btnSaveMobile: document.getElementById('btn-save-mobile'),
            
            historyEmpty: document.getElementById('history-empty'),
            historyList: document.getElementById('history-list'),
            btnGoCalc: document.getElementById('btn-go-calc'),
            btnClearHistory: document.getElementById('btn-clear-history'),
            
            toast: document.getElementById('toast'),
            toastMessage: document.getElementById('toast-message')
        };
    }

    var state = {
        results: null
    };

    function calculate() {
        var totalCapital = parseFlexibleNumber(elements.totalCapital.value);
        var maxRiskInput = elements.maxRisk.value.trim();
        var leverage = parseFlexibleNumber(elements.leverage.value);
        var entryPrice = parseFlexibleNumber(elements.entryPrice.value);
        var stopLoss = parseFlexibleNumber(elements.stopLoss.value);
        var takeProfit = parseFlexibleNumber(elements.takeProfit.value);

        if (!totalCapital || !leverage || !entryPrice || !stopLoss) {
            hideResults();
            return;
        }

        if (!maxRiskInput) {
            hideResults();
            return;
        }

        var isLong = entryPrice > stopLoss;
        var priceDistSL = Math.abs(entryPrice - stopLoss) / entryPrice;

        if (priceDistSL === 0) {
            hideResults();
            return;
        }

        var riskUnitSelect = document.getElementById('riskUnitSelect');
        var riskUnit = riskUnitSelect ? riskUnitSelect.value : '$';
        var riskValue = parseFlexibleNumber(maxRiskInput.replace('%', '').replace('$', ''));
        
        var riskUSD;
        if (riskUnit === '%') {
            riskUSD = totalCapital * (riskValue / 100);
        } else {
            riskUSD = riskValue;
        }

        if (isNaN(riskUSD) || riskUSD <= 0) {
            hideResults();
            return;
        }

        var positionSize = riskUSD / priceDistSL;
        var marginCost = positionSize / leverage;
        var amountOfPosition = marginCost * leverage;

        var rewardAmount = 0;
        var rrRatio = 0;
        if (takeProfit > 0) {
            var priceDistTP = Math.abs(takeProfit - entryPrice) / entryPrice;
            rewardAmount = positionSize * priceDistTP;
            rrRatio = priceDistTP / priceDistSL;
        }

        var liqMove = 0.8 / leverage;
        var liqPriceIsolated = isLong ? entryPrice * (1 - liqMove) : entryPrice * (1 + liqMove);

        var positionCoins = positionSize / entryPrice;
        var liqPriceCross = isLong 
            ? entryPrice - (totalCapital / positionCoins) 
            : entryPrice + (totalCapital / positionCoins);

        var liquidationWarning = null;
        if (marginCost > totalCapital) {
            liquidationWarning = 'Insufficient margin. Position requires $' + formatNumber(marginCost) + ' but account only has $' + formatNumber(totalCapital) + '. Try widening your SL or reducing your risk.';
        } else {
            var roeAtSL = priceDistSL * leverage * 100;
            if (roeAtSL >= 90) {
                var maxSafeLev = Math.floor(90 / (priceDistSL * 100));
                liquidationWarning = 'SL is too far for ' + leverage + 'x leverage. You will get liquidated before SL hits. Max safe leverage is ~' + Math.max(1, maxSafeLev) + 'x.';
            }
        }

        state.results = {
            positionSize: positionSize,
            marginCost: marginCost,
            amountOfPosition: amountOfPosition,
            riskAmount: riskUSD,
            rewardAmount: rewardAmount,
            rrRatio: rrRatio,
            liquidationWarning: liquidationWarning,
            liqPriceIsolated: liqPriceIsolated,
            liqPriceCross: liqPriceCross,
            totalCapital: totalCapital,
            leverage: leverage,
            entryPrice: entryPrice,
            stopLoss: stopLoss,
            takeProfit: takeProfit,
            maxRisk: maxRiskInput,
            isLong: isLong
        };

        showResults();
    }

    function showResults() {
        var r = state.results;
        if (!r) return;

        elements.emptyState.style.display = 'none';
        elements.resultsGrid.style.display = 'grid';

        if (elements.tradeDirection) {
            elements.tradeDirection.style.display = 'block';
            
            if (elements.longBox) {
                if (r.isLong) {
                    elements.longBox.style.background = 'rgba(34, 197, 94, 0.2)';
                    elements.longBox.style.border = '1px solid rgba(34, 197, 94, 0.3)';
                    elements.longBox.style.color = '#4ade80';
                    elements.longBox.style.opacity = '1';
                } else {
                    elements.longBox.style.background = 'rgba(55, 65, 81, 0.5)';
                    elements.longBox.style.border = '1px solid rgba(75, 85, 99, 0.3)';
                    elements.longBox.style.color = '#6b7280';
                    elements.longBox.style.opacity = '0.5';
                }
            }
            
            if (elements.shortBox) {
                if (!r.isLong) {
                    elements.shortBox.style.background = 'rgba(239, 68, 68, 0.2)';
                    elements.shortBox.style.border = '1px solid rgba(239, 68, 68, 0.3)';
                    elements.shortBox.style.color = '#f87171';
                    elements.shortBox.style.opacity = '1';
                } else {
                    elements.shortBox.style.background = 'rgba(55, 65, 81, 0.5)';
                    elements.shortBox.style.border = '1px solid rgba(75, 85, 99, 0.3)';
                    elements.shortBox.style.color = '#6b7280';
                    elements.shortBox.style.opacity = '0.5';
                }
            }
        }

        if (r.liquidationWarning) {
            elements.warningBanner.style.display = 'flex';
            elements.warningText.textContent = r.liquidationWarning;
        } else {
            elements.warningBanner.style.display = 'none';
        }

        if (elements.statPosition) {
            elements.statPosition.textContent = '$' + formatNumber(r.amountOfPosition);
            elements.statPositionSub.textContent = 'Total Position Size';
        }

        elements.statMargin.textContent = '$' + formatNumber(r.marginCost || 0);
        var marginPercent = (r.totalCapital > 0 && r.marginCost > 0) ? ((r.marginCost / r.totalCapital) * 100).toFixed(1) : '0.0';
        elements.statMarginSub.textContent = marginPercent + '% of Account Balance';

        elements.statRisk.textContent = '-$' + formatNumber(r.riskAmount);
        elements.statRiskSub.textContent = ((r.riskAmount / r.totalCapital) * 100).toFixed(1) + '% of Account Balance';

        elements.statProfit.textContent = '+$' + formatNumber(r.rewardAmount);
        elements.statProfitSub.textContent = ((r.rewardAmount / r.totalCapital) * 100).toFixed(1) + '% of Account Balance Gain';

        elements.statRr.textContent = '1:' + r.rrRatio.toFixed(2);
        if (r.rrRatio > 2) {
            elements.statRrSub.textContent = 'Good Ratio';
        } else {
            elements.statRrSub.textContent = 'Low Ratio';
        }

        var roe = r.marginCost > 0 ? ((r.rewardAmount / r.marginCost) * 100).toFixed(1) : '0';
        elements.statRoe.textContent = roe + '%';
        if (elements.statRoeSub) {
            elements.statRoeSub.textContent = 'Return on Equity (ROE)';
        }

        elements.statLiqIsolatedValue.textContent = '$' + formatPrice(r.liqPriceIsolated);
        elements.statLiqIsolatedSub.textContent = 'Isolated Margin Liquidation';

        elements.statLiqCrossValue.textContent = '$' + formatPrice(r.liqPriceCross);
        elements.statLiqCrossSub.textContent = 'Cross Margin Liquidation';

        elements.btnSaveMobile.disabled = false;
    }

    function hideResults() {
        state.results = null;
        elements.emptyState.style.display = 'flex';
        elements.resultsGrid.style.display = 'none';
        elements.warningBanner.style.display = 'none';
        elements.btnSaveMobile.disabled = true;
        if (elements.tradeDirection) {
            elements.tradeDirection.style.display = 'none';
        }
    }

    function resetForm() {
        elements.totalCapital.value = '';
        elements.maxRisk.value = '';
        elements.leverage.value = '';
        elements.entryPrice.value = '';
        elements.stopLoss.value = '';
        elements.takeProfit.value = '';
        hideResults();
    }

    function saveCalculation() {
        if (!state.results) return;

        var r = state.results;
        var calc = {
            totalCapital: r.totalCapital,
            maxRisk: r.maxRisk,
            leverage: r.leverage,
            entryPrice: r.entryPrice,
            stopLoss: r.stopLoss,
            takeProfit: r.takeProfit,
            positionSize: r.positionSize,
            marginCost: r.marginCost,
            riskAmount: r.riskAmount,
            rewardAmount: r.rewardAmount,
            rrRatio: r.rrRatio,
            liqPriceIsolated: r.liqPriceIsolated,
            liqPriceCross: r.liqPriceCross
        };

        var saved = Storage.save(calc);
        if (saved) {
            showToast('Saved to History');
        } else {
            showToast('Failed to save');
        }
    }

    function showPage(pageName) {
        elements.pageCalculator.classList.remove('active');
        elements.pageHistory.classList.remove('active');

        if (pageName === 'history') {
            elements.pageHistory.classList.add('active');
            renderHistory();
        } else {
            elements.pageCalculator.classList.add('active');
        }
    }

    function renderHistory() {
        var history = Storage.getAll();

        if (history.length === 0) {
            elements.historyEmpty.style.display = 'flex';
            elements.historyList.style.display = 'none';
            elements.btnClearHistory.style.display = 'none';
            return;
        }

        elements.historyEmpty.style.display = 'none';
        elements.historyList.style.display = 'flex';
        elements.btnClearHistory.style.display = 'block';

        var html = '';
        for (var i = 0; i < history.length; i++) {
            var calc = history[i];
            var date = calc.createdAt ? formatDate(calc.createdAt) : 'Today';
            
            html += '<div class="history-card animate-in" style="animation-delay: ' + (i * 50) + 'ms;">' +
                '<div class="history-card-content">' +
                    '<div class="history-metrics">' +
                        '<div class="history-metric">' +
                            '<span class="history-metric-label">Entry</span>' +
                            '<span class="history-metric-value">$' + formatPrice(calc.entryPrice) + '</span>' +
                        '</div>' +
                        '<div class="history-metric">' +
                            '<span class="history-metric-label">Stop Loss</span>' +
                            '<span class="history-metric-value danger">$' + formatPrice(calc.stopLoss) + '</span>' +
                        '</div>' +
                        '<div class="history-metric">' +
                            '<span class="history-metric-label">Target</span>' +
                            '<span class="history-metric-value success">' + (calc.takeProfit ? '$' + formatPrice(calc.takeProfit) : '-') + '</span>' +
                        '</div>' +
                        '<div class="history-metric">' +
                            '<span class="history-metric-label">R:R Ratio</span>' +
                            '<span class="history-metric-value primary">' + (calc.rrRatio ? calc.rrRatio.toFixed(2) : '0') + 'R</span>' +
                        '</div>' +
                    '</div>' +
                    '<div class="history-right">' +
                        '<div class="history-size">' +
                            '<span class="history-size-label">Size (' + calc.leverage + 'x)</span>' +
                            '<span class="history-size-value">$' + formatNumber(calc.positionSize, 0) + '</span>' +
                        '</div>' +
                        '<span class="history-date">' + date + '</span>' +
                        '<button class="history-delete" data-id="' + calc.id + '" title="Delete">' +
                            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
                                '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' +
                            '</svg>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        }

        elements.historyList.innerHTML = html;

        var deleteButtons = elements.historyList.querySelectorAll('.history-delete');
        for (var j = 0; j < deleteButtons.length; j++) {
            deleteButtons[j].addEventListener('click', function(e) {
                var id = parseInt(this.getAttribute('data-id'));
                if (confirm('Delete this calculation?')) {
                    Storage.delete(id);
                    renderHistory();
                    showToast('Deleted');
                }
            });
        }
    }

    function formatDate(isoString) {
        try {
            var date = new Date(isoString);
            var now = new Date();
            var diffTime = now - date;
            var diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return diffDays + ' days ago';

            var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return months[date.getMonth()] + ' ' + date.getDate();
        } catch (e) {
            return 'Today';
        }
    }

    function clearHistory() {
        if (confirm('Delete all history?')) {
            Storage.clearAll();
            renderHistory();
            showToast('History cleared');
        }
    }

    var toastTimeout = null;

    function showToast(message) {
        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }

        elements.toastMessage.textContent = message;
        elements.toast.style.display = 'block';

        toastTimeout = setTimeout(function() {
            elements.toast.style.display = 'none';
        }, 2500);
    }

    function setupEventListeners() {
        elements.navHistory.addEventListener('click', function() {
            showPage('history');
        });

        elements.navBack.addEventListener('click', function() {
            showPage('calculator');
        });

        elements.btnGoCalc.addEventListener('click', function() {
            showPage('calculator');
        });

        var inputs = [
            elements.totalCapital,
            elements.maxRisk,
            elements.leverage,
            elements.entryPrice,
            elements.stopLoss,
            elements.takeProfit
        ].filter(function(el) { return el !== null; });

        for (var i = 0; i < inputs.length; i++) {
            inputs[i].addEventListener('input', calculate);
            
            inputs[i].addEventListener('focus', function(e) {
                if (e.target.value === '0') {
                    e.target.value = '';
                }
            });
        }

        var riskUnitSelect = document.getElementById('riskUnitSelect');
        if (riskUnitSelect) {
            riskUnitSelect.addEventListener('change', calculate);
        }

        elements.btnResetMobile.addEventListener('click', resetForm);
        elements.btnSaveMobile.addEventListener('click', saveCalculation);
        elements.btnClearHistory.addEventListener('click', clearHistory);
    }

    function init() {
        try {
            initElements();
            setupEventListeners();

            elements.loadingFallback.style.display = 'none';
            elements.app.style.display = 'block';

            showPage('calculator');

            console.log('Crypto Futures TradeMath - Initialized');
        } catch (e) {
            console.error('Initialization error:', e);
            document.getElementById('loading-fallback').innerHTML = 
                '<div style="text-align:center;padding:20px;">' +
                    '<h2 style="color:#FF3B6D;">Error Loading App</h2>' +
                    '<p style="color:#8B92A7;margin:12px 0;">' + e.message + '</p>' +
                    '<button onclick="location.reload()" style="padding:12px 24px;background:#00D9A3;color:#121212;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Reload</button>' +
                '</div>';
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
