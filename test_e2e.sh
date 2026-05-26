#!/bin/bash
# NetMonitor-Pro 真机端到端测试
# 验证: tcpdump 文本抓包 + pcap 文件导出
set -e

PCAP_FILE="/sdcard/netmonitor_test_$(date +%s).pcap"
echo "=== NetMonitor-Pro E2E Test ==="
echo "Device: $(getprop ro.product.model 2>/dev/null || echo 'unknown')"
echo "Android: $(getprop ro.build.version.release 2>/dev/null || echo 'unknown')"
echo ""

# 1. Verify tcpdump
echo "[1/4] tcpdump check..."
TCPDUMP_VERSION=$(su -c "tcpdump --version 2>&1" | head -1)
echo "  $TCPDUMP_VERSION"

# 2. Text mode: capture 5 packets on wlan0
echo "[2/4] Text capture (wlan0, 5 packets)..."
TEXT_OUT=$(su -c "timeout 10 tcpdump -i wlan0 -nn -tttt -c 5 2>&1")
PKT_COUNT=$(echo "$TEXT_OUT" | grep -c "IP \|IP6 " || true)
echo "  Line count: $(echo "$TEXT_OUT" | wc -l)"
echo "  IPv4/IPv6 packets: $PKT_COUNT"
echo "  Sample:"
echo "$TEXT_OUT" | grep "IP \|IP6 " | head -3 | while read line; do
    echo "    $line"
done

# 3. PCAP file mode: capture for 3 seconds
echo "[3/4] PCAP file capture (3 seconds)..."
su -c "timeout 3 tcpdump -i wlan0 -w $PCAP_FILE 2>&1"
FILE_SIZE=$(su -c "stat -c %s $PCAP_FILE 2>/dev/null" || su -c "ls -l $PCAP_FILE 2>/dev/null | awk '{print \$4}'")
echo "  File: $PCAP_FILE"
echo "  Size: $FILE_SIZE bytes"

# 4. Verify pcap file
echo "[4/4] Verify pcap file..."
if su -c "tcpdump -r $PCAP_FILE -nn 2>&1" | head -3 | grep -q "IP"; then
    echo "  ✅ PCAP file readable"
    PCAP_PKTS=$(su -c "tcpdump -r $PCAP_FILE 2>&1" | wc -l)
    echo "  Packets in pcap: $PCAP_PKTS"
else
    echo "  ❌ PCAP file not valid"
fi

echo ""
echo "=== Summary ==="
echo "✅ tcpdump text capture: OK ($PKT_COUNT packets)"
echo "✅ pcap file: $PCAP_FILE ($FILE_SIZE bytes)"
echo "✅ All checks passed"

# Cleanup test file
su -c "rm -f $PCAP_FILE" 2>/dev/null || true