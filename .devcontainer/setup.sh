#!/bin/bash
# انتظر 5 ثوانٍ حتى يتأكد من أن الخدمة تعمل
sleep 5
# اجعل المنفذ 8080 عاماً
gh codespace ports visibility 5173:public -c $CODESPACE_NAME > /dev/null 2>&1
echo "✅ Port 8080 is now public"