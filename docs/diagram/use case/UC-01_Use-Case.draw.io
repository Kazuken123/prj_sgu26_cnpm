<mxfile host="app.diagrams.net" pages="18">
  <diagram name="Page-1" id="c0yEXKlfFEknzNZyqfFm">
    <mxGraphModel dx="964" dy="668" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="7iI1iVAQek7fpgIRc4Q6-10" parent="1" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;" value="khách tham quan&lt;div&gt;&lt;br&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="100" width="60" x="100" y="220" as="geometry" />
        </mxCell>
        <mxCell id="7iI1iVAQek7fpgIRc4Q6-12" parent="1" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;" value="Cổng thanh toán&lt;div&gt;&lt;br&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="100" width="70" x="640" y="225" as="geometry" />
        </mxCell>
        <mxCell id="7iI1iVAQek7fpgIRc4Q6-18" parent="1" style="ellipse;whiteSpace=wrap;html=1;shapeInside=1;" value="" vertex="1">
          <mxGeometry height="80" width="150" x="350" y="260" as="geometry" />
        </mxCell>
        <mxCell id="7iI1iVAQek7fpgIRc4Q6-20" parent="1" style="text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;rounded=0;" value="Thanh toán trực tuyến" vertex="1">
          <mxGeometry height="30" width="70" x="390" y="285" as="geometry" />
        </mxCell>
        <mxCell id="7iI1iVAQek7fpgIRc4Q6-22" edge="1" parent="1" source="7iI1iVAQek7fpgIRc4Q6-12" style="endArrow=none;html=1;rounded=0;exitX=0;exitY=0.3333333333333333;exitDx=0;exitDy=0;exitPerimeter=0;" target="7iI1iVAQek7fpgIRc4Q6-18" value="">
          <mxGeometry height="50" relative="1" width="50" as="geometry">
            <Array as="points">
              <mxPoint x="590" y="270" />
            </Array>
            <mxPoint x="400" y="420" as="sourcePoint" />
            <mxPoint x="660" y="390" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="7iI1iVAQek7fpgIRc4Q6-23" edge="1" parent="1" source="7iI1iVAQek7fpgIRc4Q6-18" style="endArrow=none;html=1;rounded=0;entryX=1;entryY=0.3333333333333333;entryDx=0;entryDy=0;entryPerimeter=0;exitX=0;exitY=0.5;exitDx=0;exitDy=0;" target="7iI1iVAQek7fpgIRc4Q6-10" value="">
          <mxGeometry height="50" relative="1" width="50" as="geometry">
            <mxPoint x="400" y="420" as="sourcePoint" />
            <mxPoint x="450" y="370" as="targetPoint" />
          </mxGeometry>
        </mxCell>
        <mxCell id="7iI1iVAQek7fpgIRc4Q6-24" parent="1" style="text;html=1;whiteSpace=wrap;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;rounded=0;" value="&lt;b&gt;Hệ thống thuyết minh đa ngôn ngữ chùa linh ứng&lt;/b&gt;" vertex="1">
          <mxGeometry height="30" width="300" x="260" y="150" as="geometry" />
        </mxCell>
        <mxCell id="7iI1iVAQek7fpgIRc4Q6-25" parent="1" style="swimlane;startSize=0;" value="" vertex="1">
          <mxGeometry height="360" width="410" x="210" y="120" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
  <diagram name="1. Sơ đồ ERD Tổng Thể" id="v55won06L56fHdoDJCmV">
    <mxGraphModel dx="964" dy="648" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1800" pageHeight="1300" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="t_users" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#1f3a60;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;USERS&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;user_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;email&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;password_hash&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;full_name&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(100)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;phone_number&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(20)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;role&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(20)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;preferred_language&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(10)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;failed_login_count&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;locked_until&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;status&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(20)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;created_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;updated_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="310" width="270" x="50" y="50" as="geometry" />
        </mxCell>
        <mxCell id="t_owner_requests" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#1f3a60;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;OWNER_REQUESTS&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;request_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;user_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;restaurant_name&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;restaurant_address&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;phone_number&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(20)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;status&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(20)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;rejection_reason&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;TEXT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;reviewed_by&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;created_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;updated_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="260" width="270" x="50" y="400" as="geometry" />
        </mxCell>
        <mxCell id="t_audit_logs" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#1f3a60;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;AUDIT_LOGS&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;log_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;BIGINT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;user_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;action&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(100)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;resource_type&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(50)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;resource_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(50)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;details&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;TEXT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;ip_address&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(45)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;created_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="220" width="270" x="50" y="700" as="geometry" />
        </mxCell>
        <mxCell id="t_reviews" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#a04000;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;REVIEWS&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;review_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;user_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;poi_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;rating&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;comment&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;TEXT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;created_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;updated_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="200" width="270" x="50" y="960" as="geometry" />
        </mxCell>
        <mxCell id="t_pois" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#235c3b;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;POIS&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;poi_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;owner_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;name&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;address&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;latitude&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DECIMAL(10,8)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;longitude&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DECIMAL(11,8)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;trigger_radius&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;opening_hours&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(100)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;avatar_url&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(500)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;status&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(20)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;rejection_reason&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;TEXT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;created_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;updated_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="330" width="280" x="420" y="160" as="geometry" />
        </mxCell>
        <mxCell id="t_poi_categories" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#235c3b;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;POI_CATEGORIES&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK,FK&lt;/span&gt; &lt;b&gt;poi_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK,FK&lt;/span&gt; &lt;b&gt;category_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="100" width="260" x="420" y="540" as="geometry" />
        </mxCell>
        <mxCell id="t_categories" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#235c3b;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;CATEGORIES&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;category_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;name&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(100)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;description&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;TEXT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;created_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="140" width="260" x="420" y="680" as="geometry" />
        </mxCell>
        <mxCell id="t_dishes" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#235c3b;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;DISHES&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;dish_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;poi_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;name&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;price&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DECIMAL(12,2)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;image_url&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(500)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;description&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;TEXT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;created_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="190" width="260" x="420" y="860" as="geometry" />
        </mxCell>
        <mxCell id="t_poi_images" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#235c3b;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;POI_IMAGES&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;image_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;poi_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;image_url&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(500)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;caption&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;created_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="150" width="260" x="420" y="1090" as="geometry" />
        </mxCell>
        <mxCell id="t_languages" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#7d3c98;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;LANGUAGES&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;code&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(10)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;name&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(50)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;is_active&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;TINYINT(1)&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="120" width="260" x="820" y="50" as="geometry" />
        </mxCell>
        <mxCell id="t_poi_translations" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#7d3c98;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;POI_TRANSLATIONS&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;translation_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;poi_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;language_code&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(10)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;name&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;description&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;TEXT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;audio_script&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;TEXT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;status&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(20)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;created_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;updated_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="240" width="280" x="820" y="240" as="geometry" />
        </mxCell>
        <mxCell id="t_audios" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#7d3c98;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;AUDIOS&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;audio_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;poi_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;language_code&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(10)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;file_url&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(500)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;duration&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;file_size&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;status&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(20)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;created_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;updated_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="230" width="280" x="820" y="530" as="geometry" />
        </mxCell>
        <mxCell id="t_dish_translations" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#7d3c98;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;DISH_TRANSLATIONS&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;translation_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;dish_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;language_code&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(10)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;name&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;description&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;TEXT&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="160" width="280" x="820" y="820" as="geometry" />
        </mxCell>
        <mxCell id="e_u_req" edge="1" parent="1" source="t_users" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=0.5;exitY=1;entryX=0.5;entryY=0;" target="t_owner_requests" value="1 : 0..n">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e_u_aud" edge="1" parent="1" source="t_users" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=0.5;exitY=1;entryX=0.5;entryY=0;" target="t_audit_logs" value="1 : 0..n">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e_u_poi" edge="1" parent="1" source="t_users" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=1;exitY=0.5;entryX=0;entryY=0.3;" target="t_pois" value="1 : 0..n">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e_u_rev" edge="1" parent="1" source="t_users" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=0.2;exitY=1;entryX=0.2;entryY=0;" target="t_reviews" value="1 : 0..n">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e_p_rev" edge="1" parent="1" source="t_pois" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=0;exitY=0.8;entryX=1;entryY=0.5;" target="t_reviews" value="1 : 0..n">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e_p_pc" edge="1" parent="1" source="t_pois" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=0.5;exitY=1;entryX=0.5;entryY=0;" target="t_poi_categories" value="1 : 0..n">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e_c_pc" edge="1" parent="1" source="t_categories" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=0.5;exitY=0;entryX=0.5;entryY=1;" target="t_poi_categories" value="1 : 0..n">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e_p_dish" edge="1" parent="1" source="t_pois" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=0.3;exitY=1;entryX=0.3;entryY=0;" target="t_dishes" value="1 : 0..n">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e_p_img" edge="1" parent="1" source="t_pois" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=0.1;exitY=1;entryX=0.1;entryY=0;" target="t_poi_images" value="1 : 0..n">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e_l_pt" edge="1" parent="1" source="t_languages" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=0.5;exitY=1;entryX=0.5;entryY=0;" target="t_poi_translations" value="1 : 0..n">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e_p_pt" edge="1" parent="1" source="t_pois" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=1;exitY=0.5;entryX=0;entryY=0.5;" target="t_poi_translations" value="1 : 1..n">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e_l_au" edge="1" parent="1" source="t_languages" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=0.7;exitY=1;entryX=0.7;entryY=0;" target="t_audios" value="1 : 0..n">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e_p_au" edge="1" parent="1" source="t_pois" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=1;exitY=0.7;entryX=0;entryY=0.5;" target="t_audios" value="1 : 0..n">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e_l_dt" edge="1" parent="1" source="t_languages" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=0.9;exitY=1;entryX=0.9;entryY=0;" target="t_dish_translations" value="1 : 0..n">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e_d_dt" edge="1" parent="1" source="t_dishes" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=1;exitY=0.5;entryX=0;entryY=0.5;" target="t_dish_translations" value="1 : 0..n">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
  <diagram name="2. Phân hệ Tài khoản và Phân quyền" id="0XCQa39jbo3WBRnkffQd">
    <mxGraphModel grid="1" page="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" pageScale="1" pageWidth="1100" pageHeight="800" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="u_users" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#1f3a60;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;USERS&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;user_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;email&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;password_hash&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;full_name&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(100)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;phone_number&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(20)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;role&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(20)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;preferred_language&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(10)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;failed_login_count&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;locked_until&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;status&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(20)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;created_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;updated_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="310" width="300" x="60" y="80" as="geometry" />
        </mxCell>
        <mxCell id="u_requests" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#1f3a60;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;OWNER_REQUESTS&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;request_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;user_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;restaurant_name&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;restaurant_address&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;phone_number&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(20)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;status&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(20)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;rejection_reason&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;TEXT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;reviewed_by&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;created_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;updated_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="260" width="300" x="480" y="80" as="geometry" />
        </mxCell>
        <mxCell id="u_logs" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#1f3a60;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;AUDIT_LOGS&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;log_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;BIGINT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;user_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;action&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(100)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;resource_type&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(50)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;resource_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(50)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;details&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;TEXT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;ip_address&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(45)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;created_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="220" width="300" x="480" y="390" as="geometry" />
        </mxCell>
        <mxCell id="e2_1" edge="1" parent="1" source="u_users" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=1;exitY=0.3;entryX=0;entryY=0.3;" target="u_requests" value="1 : 0..n (user_id)">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e2_2" edge="1" parent="1" source="u_users" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=1;exitY=0.7;entryX=0;entryY=0.7;" target="u_requests" value="1 : 0..n (reviewed_by)">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e2_3" edge="1" parent="1" source="u_users" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=0.5;exitY=1;entryX=0;entryY=0.5;" target="u_logs" value="1 : 0..n (user_id)">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
  <diagram name="3. Phân hệ Địa điểm và Thực đơn" id="cay1YHdo0kEZAD-1L9e_">
    <mxGraphModel grid="1" page="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" pageScale="1" pageWidth="1100" pageHeight="800" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="p_pois" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#235c3b;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;POIS&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;poi_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;owner_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;name&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;address&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;latitude&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DECIMAL(10,8)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;longitude&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DECIMAL(11,8)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;trigger_radius&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;opening_hours&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(100)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;avatar_url&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(500)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;status&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(20)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;rejection_reason&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;TEXT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;created_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;updated_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="330" width="300" x="60" y="80" as="geometry" />
        </mxCell>
        <mxCell id="p_poi_cat" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#235c3b;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;POI_CATEGORIES&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK,FK&lt;/span&gt; &lt;b&gt;poi_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK,FK&lt;/span&gt; &lt;b&gt;category_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="100" width="260" x="480" y="80" as="geometry" />
        </mxCell>
        <mxCell id="p_cat" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#235c3b;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;CATEGORIES&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;category_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;name&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(100)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;description&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;TEXT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;created_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="140" width="260" x="480" y="230" as="geometry" />
        </mxCell>
        <mxCell id="p_dishes" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#235c3b;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;DISHES&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;dish_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;poi_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;name&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;price&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DECIMAL(12,2)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;image_url&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(500)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;description&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;TEXT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;created_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="190" width="300" x="60" y="470" as="geometry" />
        </mxCell>
        <mxCell id="p_imgs" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#235c3b;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;POI_IMAGES&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;image_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;poi_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;image_url&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(500)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;caption&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;created_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="150" width="280" x="480" y="470" as="geometry" />
        </mxCell>
        <mxCell id="e3_1" edge="1" parent="1" source="p_pois" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=1;exitY=0.2;entryX=0;entryY=0.5;" target="p_poi_cat" value="1 : 0..n (poi_id)">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e3_2" edge="1" parent="1" source="p_cat" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=0.5;exitY=0;entryX=0.5;entryY=1;" target="p_poi_cat" value="1 : 0..n (category_id)">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e3_3" edge="1" parent="1" source="p_pois" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=0.5;exitY=1;entryX=0.5;entryY=0;" target="p_dishes" value="1 : 0..n (poi_id)">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e3_4" edge="1" parent="1" source="p_pois" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=1;exitY=0.8;entryX=0;entryY=0.5;" target="p_imgs" value="1 : 0..n (poi_id)">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
  <diagram name="4. Phân hệ Đa ngôn ngữ và Âm thanh" id="Hvgx6-dCJvCQ1vNc9j3o">
    <mxGraphModel grid="1" page="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" pageScale="1" pageWidth="1100" pageHeight="800" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="m_lang" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#7d3c98;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;LANGUAGES&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;code&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(10)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;name&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(50)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;is_active&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;TINYINT(1)&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="120" width="280" x="60" y="80" as="geometry" />
        </mxCell>
        <mxCell id="m_poi_ref" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#235c3b;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;POIS (TRÍCH YẾU)&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;poi_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;name&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="100" width="280" x="60" y="260" as="geometry" />
        </mxCell>
        <mxCell id="m_dish_ref" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#235c3b;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;DISHES (TRÍCH YẾU)&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;dish_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;poi_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;name&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="120" width="280" x="60" y="420" as="geometry" />
        </mxCell>
        <mxCell id="m_poi_trans" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#7d3c98;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;POI_TRANSLATIONS&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;translation_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;poi_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;language_code&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(10)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;name&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;description&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;TEXT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;audio_script&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;TEXT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;status&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(20)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;created_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;updated_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="240" width="310" x="480" y="80" as="geometry" />
        </mxCell>
        <mxCell id="m_audios" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#7d3c98;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;AUDIOS&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;audio_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;poi_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;language_code&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(10)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;file_url&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(500)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;duration&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;file_size&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;status&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(20)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;created_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;updated_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="230" width="310" x="480" y="360" as="geometry" />
        </mxCell>
        <mxCell id="m_dish_trans" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#7d3c98;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;DISH_TRANSLATIONS&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;translation_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;dish_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;language_code&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(10)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;name&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;description&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;TEXT&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="160" width="310" x="480" y="630" as="geometry" />
        </mxCell>
        <mxCell id="e4_1" edge="1" parent="1" source="m_lang" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=1;exitY=0.3;entryX=0;entryY=0.2;" target="m_poi_trans" value="1 : 0..n (language_code)">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e4_2" edge="1" parent="1" source="m_poi_ref" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=1;exitY=0.5;entryX=0;entryY=0.6;" target="m_poi_trans" value="1 : 1..n (poi_id)">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e4_3" edge="1" parent="1" source="m_lang" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=1;exitY=0.7;entryX=0;entryY=0.2;" target="m_audios" value="1 : 0..n (language_code)">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e4_4" edge="1" parent="1" source="m_poi_ref" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=1;exitY=0.8;entryX=0;entryY=0.5;" target="m_audios" value="1 : 0..n (poi_id)">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e4_5" edge="1" parent="1" source="m_dish_ref" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=1;exitY=0.5;entryX=0;entryY=0.5;" target="m_dish_trans" value="1 : 0..n (dish_id)">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
  <diagram name="5. Phân hệ Đánh giá trải nghiệm" id="kfaxkRXgBpH598nDlBTS">
    <mxGraphModel grid="1" page="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" pageScale="1" pageWidth="1100" pageHeight="800" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="r_users" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#1f3a60;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;USERS (TRÍCH YẾU)&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;user_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;full_name&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(100)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;role&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(20)&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="120" width="280" x="60" y="80" as="geometry" />
        </mxCell>
        <mxCell id="r_pois" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#235c3b;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;POIS (TRÍCH YẾU)&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;poi_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;name&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;address&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;VARCHAR(255)&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="120" width="280" x="60" y="260" as="geometry" />
        </mxCell>
        <mxCell id="r_reviews" parent="1" style="rounded=1;whiteSpace=wrap;html=1;overflow=hidden;strokeColor=#4a5568;strokeWidth=1.5;fillColor=#ffffff;shadow=0;" value="&lt;div style=&#39;background-color:#a04000;color:#ffffff;padding:6px;font-weight:bold;text-align:center;font-size:13px;border-top-left-radius:3px;border-top-right-radius:3px;&#39;&gt;REVIEWS&lt;/div&gt;&lt;div style=&#39;padding:6px;font-family:monospace;font-size:11px;background-color:#ffffff;&#39;&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#b30000;font-weight:bold;&#39;&gt;PK&lt;/span&gt; &lt;b&gt;review_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;user_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&lt;span style=&#39;color:#0055b3;font-weight:bold;&#39;&gt;FK&lt;/span&gt; &lt;b&gt;poi_id&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;rating&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;INT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;comment&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;TEXT&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;created_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;div style=&#39;border-bottom:1px solid #f0f0f0;padding:2px 0;&#39;&gt;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&amp;nbsp;&lt;b&gt;updated_at&lt;/b&gt; : &lt;span style=&#39;color:#666;&#39;&gt;DATETIME&lt;/span&gt;&lt;/div&gt;&lt;/div&gt;" vertex="1">
          <mxGeometry height="200" width="310" x="480" y="140" as="geometry" />
        </mxCell>
        <mxCell id="e5_1" edge="1" parent="1" source="r_users" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=1;exitY=0.5;entryX=0;entryY=0.3;" target="r_reviews" value="1 : 0..n (user_id)">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e5_2" edge="1" parent="1" source="r_pois" style="edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;strokeColor=#4a5568;strokeWidth=1.5;endArrow=ERmany;startArrow=ERone;exitX=1;exitY=0.5;entryX=0;entryY=0.7;" target="r_reviews" value="1 : 0..n (poi_id)">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
  <diagram name="UC-01 Thanh toán trực tuyến" id="M2dyuZBxznLwaL_2Ig_R">
    <mxGraphModel dx="964" dy="668" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1100" pageHeight="650" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="title" parent="1" style="text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontStyle=1;fontSize=22;fontColor=#1F4E79;" value="UC-01 — Thanh toán trực tuyến" vertex="1">
          <mxGeometry height="45" width="800" x="150" y="15" as="geometry" />
        </mxCell>
        <mxCell id="boundary" parent="1" style="rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#64748B;strokeWidth=1.5;align=left;verticalAlign=top;spacingTop=10;spacingLeft=12;fontStyle=1;fontSize=15;" value="Hệ thống thuyết minh đa ngôn ngữ Chùa Linh Ứng" vertex="1">
          <mxGeometry height="500" width="700" x="290" y="80" as="geometry" />
        </mxCell>
        <mxCell id="actor0" parent="1" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=#FFFFFF;strokeColor=#334155;fontSize=13;" value="Khách tham quan" vertex="1">
          <mxGeometry height="100" width="100" x="65" y="210" as="geometry" />
        </mxCell>
        <mxCell id="actor_edge0" edge="1" parent="1" source="actor0" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=none;strokeColor=#475569;strokeWidth=1.5;" target="online" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="actor1" parent="1" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=#FFFFFF;strokeColor=#334155;fontSize=13;" value="Cổng thanh toán" vertex="1">
          <mxGeometry height="100" width="100" x="970" y="390" as="geometry" />
        </mxCell>
        <mxCell id="actor_edge1" edge="1" parent="1" source="actor1" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=none;strokeColor=#475569;strokeWidth=1.5;" target="online" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="online" parent="1" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#EFF6FF;strokeColor=#1F4E79;strokeWidth=1.8;fontSize=16;fontStyle=1;" value="Thanh toán trực tuyến" vertex="1">
          <mxGeometry height="105" width="330" x="475" y="265" as="geometry" />
        </mxCell>
        <mxCell id="note" parent="1" style="shape=note;whiteSpace=wrap;html=1;size=15;fillColor=#FFF7ED;strokeColor=#D97706;fontSize=12;" value="Chỉ cấp quyền khi kết quả thanh toán được xác minh thành công." vertex="1">
          <mxGeometry height="80" width="420" x="430" y="435" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
  <diagram name="UC-02 Thanh toán tiền mặt" id="oNKgvPtked26mg4CYKL0">
    <mxGraphModel grid="1" page="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" pageScale="1" pageWidth="1100" pageHeight="650" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="title" parent="1" style="text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontStyle=1;fontSize=22;fontColor=#1F4E79;" value="UC-02 — Thanh toán tiền mặt" vertex="1">
          <mxGeometry height="45" width="800" x="150" y="15" as="geometry" />
        </mxCell>
        <mxCell id="boundary" parent="1" style="rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#64748B;strokeWidth=1.5;align=left;verticalAlign=top;spacingTop=10;spacingLeft=12;fontStyle=1;fontSize=15;" value="Hệ thống thuyết minh đa ngôn ngữ Chùa Linh Ứng" vertex="1">
          <mxGeometry height="500" width="700" x="290" y="80" as="geometry" />
        </mxCell>
        <mxCell id="actor0" parent="1" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=#FFFFFF;strokeColor=#334155;fontSize=13;" value="Khách tham quan" vertex="1">
          <mxGeometry height="100" width="100" x="65" y="285" as="geometry" />
        </mxCell>
        <mxCell id="actor_edge0" edge="1" parent="1" source="actor0" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=none;strokeColor=#475569;strokeWidth=1.5;" target="cash" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="cash" parent="1" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#EFF6FF;strokeColor=#1F4E79;strokeWidth=1.8;fontSize=16;fontStyle=1;" value="Yêu cầu thanh toán tiền mặt\nnhận mã phiên" vertex="1">
          <mxGeometry height="105" width="330" x="475" y="265" as="geometry" />
        </mxCell>
        <mxCell id="note" parent="1" style="shape=note;whiteSpace=wrap;html=1;size=15;fillColor=#FFF7ED;strokeColor=#D97706;fontSize=12;" value="Phiên ở trạng thái chờ cho đến khi STAFF xác nhận tại UC-11." vertex="1">
          <mxGeometry height="80" width="420" x="430" y="435" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
  <diagram name="UC-07 Lựa chọn và tùy chỉnh lộ trình" id="UuKbACtuf0qr0wAo91SZ">
    <mxGraphModel grid="1" page="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" pageScale="1" pageWidth="1100" pageHeight="650" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="title" parent="1" style="text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontStyle=1;fontSize=22;fontColor=#1F4E79;" value="UC-07 — Lựa chọn và tùy chỉnh lộ trình" vertex="1">
          <mxGeometry height="45" width="800" x="150" y="15" as="geometry" />
        </mxCell>
        <mxCell id="boundary" parent="1" style="rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#64748B;strokeWidth=1.5;align=left;verticalAlign=top;spacingTop=10;spacingLeft=12;fontStyle=1;fontSize=15;" value="Hệ thống thuyết minh đa ngôn ngữ Chùa Linh Ứng" vertex="1">
          <mxGeometry height="500" width="700" x="290" y="80" as="geometry" />
        </mxCell>
        <mxCell id="actor0" parent="1" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=#FFFFFF;strokeColor=#334155;fontSize=13;" value="Khách tham quan" vertex="1">
          <mxGeometry height="100" width="100" x="65" y="285" as="geometry" />
        </mxCell>
        <mxCell id="actor_edge0" edge="1" parent="1" source="actor0" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=none;strokeColor=#475569;strokeWidth=1.5;" target="route" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="route" parent="1" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#EFF6FF;strokeColor=#1F4E79;strokeWidth=1.8;fontSize=16;fontStyle=1;" value="Lựa chọn và tùy chỉnh lộ trình" vertex="1">
          <mxGeometry height="105" width="330" x="475" y="265" as="geometry" />
        </mxCell>
        <mxCell id="note" parent="1" style="shape=note;whiteSpace=wrap;html=1;size=15;fillColor=#FFF7ED;strokeColor=#D97706;fontSize=12;" value="Sắp xếp theo tọa độ gần nhất; khoảng cách chỉ là ước tính." vertex="1">
          <mxGeometry height="80" width="420" x="430" y="435" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
  <diagram name="UC-11 Xác nhận thanh toán tiền mặt" id="orBVMGQdXJsOCrNebAoS">
    <mxGraphModel grid="1" page="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" pageScale="1" pageWidth="1100" pageHeight="650" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="title" parent="1" style="text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontStyle=1;fontSize=22;fontColor=#1F4E79;" value="UC-11 — Xác nhận thanh toán tiền mặt" vertex="1">
          <mxGeometry height="45" width="800" x="150" y="15" as="geometry" />
        </mxCell>
        <mxCell id="boundary" parent="1" style="rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#64748B;strokeWidth=1.5;align=left;verticalAlign=top;spacingTop=10;spacingLeft=12;fontStyle=1;fontSize=15;" value="Hệ thống thuyết minh đa ngôn ngữ Chùa Linh Ứng" vertex="1">
          <mxGeometry height="500" width="700" x="290" y="80" as="geometry" />
        </mxCell>
        <mxCell id="actor0" parent="1" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=#FFFFFF;strokeColor=#334155;fontSize=13;" value="Nhân viên STAFF" vertex="1">
          <mxGeometry height="100" width="100" x="65" y="285" as="geometry" />
        </mxCell>
        <mxCell id="actor_edge0" edge="1" parent="1" source="actor0" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=none;strokeColor=#475569;strokeWidth=1.5;" target="confirm" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="confirm" parent="1" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#EFF6FF;strokeColor=#1F4E79;strokeWidth=1.8;fontSize=16;fontStyle=1;" value="Xác nhận đã nhận tiền\ncho phiên chờ" vertex="1">
          <mxGeometry height="105" width="330" x="475" y="265" as="geometry" />
        </mxCell>
        <mxCell id="note" parent="1" style="shape=note;whiteSpace=wrap;html=1;size=15;fillColor=#FFF7ED;strokeColor=#D97706;fontSize=12;" value="Đối chiếu mã ngắn, ghi nhận thanh toán và cấp quyền nếu hợp lệ." vertex="1">
          <mxGeometry height="80" width="420" x="430" y="435" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
  <diagram name="UC-14 Quản lý lộ trình mẫu" id="vFUePeikKvMtlZUXBCOt">
    <mxGraphModel grid="1" page="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" pageScale="1" pageWidth="1100" pageHeight="650" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="title" parent="1" style="text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontStyle=1;fontSize=22;fontColor=#1F4E79;" value="UC-14 — Quản lý lộ trình mẫu" vertex="1">
          <mxGeometry height="45" width="800" x="150" y="15" as="geometry" />
        </mxCell>
        <mxCell id="boundary" parent="1" style="rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#64748B;strokeWidth=1.5;align=left;verticalAlign=top;spacingTop=10;spacingLeft=12;fontStyle=1;fontSize=15;" value="Hệ thống thuyết minh đa ngôn ngữ Chùa Linh Ứng" vertex="1">
          <mxGeometry height="500" width="700" x="290" y="80" as="geometry" />
        </mxCell>
        <mxCell id="actor0" parent="1" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=#FFFFFF;strokeColor=#334155;fontSize=13;" value="Nhân viên STAFF" vertex="1">
          <mxGeometry height="100" width="100" x="65" y="210" as="geometry" />
        </mxCell>
        <mxCell id="actor_edge0" edge="1" parent="1" source="actor0" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=none;strokeColor=#475569;strokeWidth=1.5;" target="manage" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="actor1" parent="1" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=#FFFFFF;strokeColor=#334155;fontSize=13;" value="Quản trị viên ADMIN" vertex="1">
          <mxGeometry height="100" width="100" x="970" y="390" as="geometry" />
        </mxCell>
        <mxCell id="actor_edge1" edge="1" parent="1" source="actor1" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=none;strokeColor=#475569;strokeWidth=1.5;" target="manage" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="manage" parent="1" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#EFF6FF;strokeColor=#1F4E79;strokeWidth=1.8;fontSize=16;fontStyle=1;" value="Tạo mới / chỉnh sửa\nlộ trình mẫu" vertex="1">
          <mxGeometry height="105" width="330" x="475" y="265" as="geometry" />
        </mxCell>
        <mxCell id="note" parent="1" style="shape=note;whiteSpace=wrap;html=1;size=15;fillColor=#FFF7ED;strokeColor=#D97706;fontSize=12;" value="ADMIN kế thừa quyền STAFF theo mô hình phân quyền của báo cáo." vertex="1">
          <mxGeometry height="80" width="420" x="430" y="435" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
  <diagram name="UC-18 Giám sát sức khỏe và sử dụng" id="rZlo5cItilli6i6aVGK_">
    <mxGraphModel grid="1" page="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" pageScale="1" pageWidth="1100" pageHeight="650" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="title" parent="1" style="text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontStyle=1;fontSize=22;fontColor=#1F4E79;" value="UC-18 — Giám sát sức khỏe và sử dụng" vertex="1">
          <mxGeometry height="45" width="800" x="150" y="15" as="geometry" />
        </mxCell>
        <mxCell id="boundary" parent="1" style="rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#64748B;strokeWidth=1.5;align=left;verticalAlign=top;spacingTop=10;spacingLeft=12;fontStyle=1;fontSize=15;" value="Hệ thống thuyết minh đa ngôn ngữ Chùa Linh Ứng" vertex="1">
          <mxGeometry height="500" width="700" x="290" y="80" as="geometry" />
        </mxCell>
        <mxCell id="actor0" parent="1" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=#FFFFFF;strokeColor=#334155;fontSize=13;" value="Quản trị viên ADMIN" vertex="1">
          <mxGeometry height="100" width="100" x="65" y="285" as="geometry" />
        </mxCell>
        <mxCell id="actor_edge0" edge="1" parent="1" source="actor0" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=none;strokeColor=#475569;strokeWidth=1.5;" target="monitor" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="monitor" parent="1" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#EFF6FF;strokeColor=#1F4E79;strokeWidth=1.8;fontSize=16;fontStyle=1;" value="Xem dashboard sức khỏe\nvà số liệu sử dụng" vertex="1">
          <mxGeometry height="105" width="330" x="475" y="265" as="geometry" />
        </mxCell>
        <mxCell id="note" parent="1" style="shape=note;whiteSpace=wrap;html=1;size=15;fillColor=#FFF7ED;strokeColor=#D97706;fontSize=12;" value="Chỉ dành cho ADMIN; hiển thị các chỉ số hệ thống có sẵn." vertex="1">
          <mxGeometry height="80" width="420" x="430" y="435" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
  <diagram name="Activity UC-01 Thanh toán trực tuyến" id="qGBQV3QNHUoIYaREJ0qU">
    <mxGraphModel grid="1" page="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" pageScale="1" pageWidth="1100" pageHeight="1600" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="title" parent="1" style="text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontStyle=1;fontSize=22;fontColor=#1F4E79;" value="UC-01 — Thanh toán trực tuyến" vertex="1">
          <mxGeometry height="45" width="820" x="140" y="15" as="geometry" />
        </mxCell>
        <mxCell id="start" parent="1" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#16A34A;strokeColor=#15803D;fontColor=#FFFFFF;fontStyle=1;" value="●" vertex="1">
          <mxGeometry height="42" width="180" x="460" y="85" as="geometry" />
        </mxCell>
        <mxCell id="view" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Xem gói và giá" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="160" as="geometry" />
        </mxCell>
        <mxCell id="choose" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Chọn thanh toán trực tuyến" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="250" as="geometry" />
        </mxCell>
        <mxCell id="create" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Tạo giao dịch và chuyển sang cổng thanh toán" vertex="1">
          <mxGeometry height="65" width="260" x="350" y="340" as="geometry" />
        </mxCell>
        <mxCell id="pay" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Khách thực hiện thanh toán" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="340" as="geometry" />
        </mxCell>
        <mxCell id="webhook" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Nhận kết quả/webhook" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="430" as="geometry" />
        </mxCell>
        <mxCell id="valid" parent="1" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FEF3C7;strokeColor=#D97706;fontStyle=1;fontSize=13;" value="Kết quả hợp lệ và thành công?" vertex="1">
          <mxGeometry height="85" width="240" x="430" y="520" as="geometry" />
        </mxCell>
        <mxCell id="grant" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#DCFCE7;strokeColor=#16A34A;fontSize=13;" value="Ghi nhận giao dịch, cấp quyền/token" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="635" as="geometry" />
        </mxCell>
        <mxCell id="fail" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#FFF1F2;strokeColor=#E11D48;fontSize=12;" value="Thông báo thất bại/chưa xác nhận; không cấp quyền" vertex="1">
          <mxGeometry height="68" width="280" x="720" y="525" as="geometry" />
        </mxCell>
        <mxCell id="end" parent="1" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#1F2937;strokeColor=#111827;fontColor=#FFFFFF;fontStyle=1;" value="◎" vertex="1">
          <mxGeometry height="42" width="180" x="460" y="727" as="geometry" />
        </mxCell>
        <mxCell id="e0" edge="1" parent="1" source="start" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="view" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e1" edge="1" parent="1" source="view" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="choose" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e2" edge="1" parent="1" source="choose" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="create" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e3" edge="1" parent="1" source="create" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="pay" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e4" edge="1" parent="1" source="pay" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="webhook" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e5" edge="1" parent="1" source="webhook" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="valid" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e6" edge="1" parent="1" source="valid" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="grant" value="Có">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e7" edge="1" parent="1" source="valid" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="fail" value="Không">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e8" edge="1" parent="1" source="grant" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="end" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e9" edge="1" parent="1" source="fail" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="end" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
  <diagram name="Activity UC-02 Thanh toán tiền mặt" id="vGwbSF5f7pXbFxgV8BBN">
    <mxGraphModel grid="1" page="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" pageScale="1" pageWidth="1100" pageHeight="1600" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="title" parent="1" style="text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontStyle=1;fontSize=22;fontColor=#1F4E79;" value="UC-02 — Thanh toán tiền mặt" vertex="1">
          <mxGeometry height="45" width="820" x="140" y="15" as="geometry" />
        </mxCell>
        <mxCell id="start" parent="1" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#16A34A;strokeColor=#15803D;fontColor=#FFFFFF;fontStyle=1;" value="●" vertex="1">
          <mxGeometry height="42" width="180" x="460" y="85" as="geometry" />
        </mxCell>
        <mxCell id="view" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Xem gói và giá" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="160" as="geometry" />
        </mxCell>
        <mxCell id="choose" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Chọn thanh toán tiền mặt" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="250" as="geometry" />
        </mxCell>
        <mxCell id="session" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Tạo hoặc chọn phiên chờ thanh toán" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="340" as="geometry" />
        </mxCell>
        <mxCell id="code" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Sinh/hiển thị mã ngắn" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="430" as="geometry" />
        </mxCell>
        <mxCell id="staff" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Khách đưa mã cho nhân viên và nộp tiền" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="520" as="geometry" />
        </mxCell>
        <mxCell id="wait" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Chờ nhân viên xác nhận tại UC-11" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="610" as="geometry" />
        </mxCell>
        <mxCell id="end" parent="1" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#1F2937;strokeColor=#111827;fontColor=#FFFFFF;fontStyle=1;" value="◎" vertex="1">
          <mxGeometry height="42" width="180" x="460" y="702" as="geometry" />
        </mxCell>
        <mxCell id="e0" edge="1" parent="1" source="start" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="view" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e1" edge="1" parent="1" source="view" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="choose" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e2" edge="1" parent="1" source="choose" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="session" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e3" edge="1" parent="1" source="session" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="code" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e4" edge="1" parent="1" source="code" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="staff" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e5" edge="1" parent="1" source="staff" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="wait" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e6" edge="1" parent="1" source="wait" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="end" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
  <diagram name="Activity UC-07 Lựa chọn và tùy chỉnh lộ trình" id="dyXRcjHTwtPpU0LtOBHN">
    <mxGraphModel grid="1" page="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" pageScale="1" pageWidth="1100" pageHeight="1600" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="title" parent="1" style="text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontStyle=1;fontSize=22;fontColor=#1F4E79;" value="UC-07 — Lựa chọn và tùy chỉnh lộ trình" vertex="1">
          <mxGeometry height="45" width="820" x="140" y="15" as="geometry" />
        </mxCell>
        <mxCell id="start" parent="1" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#16A34A;strokeColor=#15803D;fontColor=#FFFFFF;fontStyle=1;" value="●" vertex="1">
          <mxGeometry height="42" width="180" x="460" y="85" as="geometry" />
        </mxCell>
        <mxCell id="open" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Mở chức năng lộ trình" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="160" as="geometry" />
        </mxCell>
        <mxCell id="show" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#DCFCE7;strokeColor=#16A34A;fontSize=13;" value="Hiển thị lộ trình mẫu và POI từ bundle" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="250" as="geometry" />
        </mxCell>
        <mxCell id="select" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Chọn mẫu hoặc tùy chỉnh" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="340" as="geometry" />
        </mxCell>
        <mxCell id="edit" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Thêm/bỏ POI; loại trùng" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="430" as="geometry" />
        </mxCell>
        <mxCell id="origin" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Chọn điểm bắt đầu" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="520" as="geometry" />
        </mxCell>
        <mxCell id="sort" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Yêu cầu sắp xếp lộ trình" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="610" as="geometry" />
        </mxCell>
        <mxCell id="calc" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Sắp xếp gần nhất theo tọa độ/Haversine" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="700" as="geometry" />
        </mxCell>
        <mxCell id="render" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#DCFCE7;strokeColor=#16A34A;fontSize=13;" value="Hiển thị thứ tự, đường nối, khoảng cách ước tính" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="790" as="geometry" />
        </mxCell>
        <mxCell id="end" parent="1" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#1F2937;strokeColor=#111827;fontColor=#FFFFFF;fontStyle=1;" value="◎" vertex="1">
          <mxGeometry height="42" width="180" x="460" y="882" as="geometry" />
        </mxCell>
        <mxCell id="e0" edge="1" parent="1" source="start" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="open" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e1" edge="1" parent="1" source="open" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="show" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e2" edge="1" parent="1" source="show" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="select" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e3" edge="1" parent="1" source="select" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="edit" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e4" edge="1" parent="1" source="edit" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="origin" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e5" edge="1" parent="1" source="origin" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="sort" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e6" edge="1" parent="1" source="sort" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="calc" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e7" edge="1" parent="1" source="calc" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="render" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e8" edge="1" parent="1" source="render" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="end" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
  <diagram name="Activity UC-11 Xác nhận thanh toán tiền mặt" id="rkaQkIIftM935tXcyljn">
    <mxGraphModel grid="1" page="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" pageScale="1" pageWidth="1100" pageHeight="1600" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="title" parent="1" style="text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontStyle=1;fontSize=22;fontColor=#1F4E79;" value="UC-11 — Xác nhận thanh toán tiền mặt" vertex="1">
          <mxGeometry height="45" width="820" x="140" y="15" as="geometry" />
        </mxCell>
        <mxCell id="start" parent="1" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#16A34A;strokeColor=#15803D;fontColor=#FFFFFF;fontStyle=1;" value="●" vertex="1">
          <mxGeometry height="42" width="180" x="460" y="85" as="geometry" />
        </mxCell>
        <mxCell id="open" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Mở chức năng xác nhận tiền mặt" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="160" as="geometry" />
        </mxCell>
        <mxCell id="enter" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Nhập/quét mã ngắn" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="250" as="geometry" />
        </mxCell>
        <mxCell id="lookup" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Tìm phiên chờ thanh toán" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="340" as="geometry" />
        </mxCell>
        <mxCell id="found" parent="1" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FEF3C7;strokeColor=#D97706;fontStyle=1;fontSize=13;" value="Tìm thấy phiên hợp lệ đang chờ?" vertex="1">
          <mxGeometry height="85" width="240" x="430" y="430" as="geometry" />
        </mxCell>
        <mxCell id="verify" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Đối chiếu thông tin và nhận tiền" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="545" as="geometry" />
        </mxCell>
        <mxCell id="confirm" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Nhân viên xác nhận đã nhận tiền" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="635" as="geometry" />
        </mxCell>
        <mxCell id="record" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#DCFCE7;strokeColor=#16A34A;fontSize=13;" value="Ghi nhận thanh toán và cấp quyền/token" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="725" as="geometry" />
        </mxCell>
        <mxCell id="error" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#FFF1F2;strokeColor=#E11D48;fontSize=12;" value="Thông báo mã/phiên không hợp lệ; không cấp quyền" vertex="1">
          <mxGeometry height="68" width="280" x="720" y="435" as="geometry" />
        </mxCell>
        <mxCell id="end" parent="1" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#1F2937;strokeColor=#111827;fontColor=#FFFFFF;fontStyle=1;" value="◎" vertex="1">
          <mxGeometry height="42" width="180" x="460" y="817" as="geometry" />
        </mxCell>
        <mxCell id="e0" edge="1" parent="1" source="start" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="open" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e1" edge="1" parent="1" source="open" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="enter" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e2" edge="1" parent="1" source="enter" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="lookup" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e3" edge="1" parent="1" source="lookup" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="found" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e4" edge="1" parent="1" source="found" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="verify" value="Có">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e5" edge="1" parent="1" source="found" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="error" value="Không">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e6" edge="1" parent="1" source="verify" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="confirm" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e7" edge="1" parent="1" source="confirm" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="record" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e8" edge="1" parent="1" source="record" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="end" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e9" edge="1" parent="1" source="error" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="end" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
  <diagram name="Activity UC-14 Quản lý lộ trình mẫu" id="Ykde6rCd4SAys5FJoJ7G">
    <mxGraphModel grid="1" page="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" pageScale="1" pageWidth="1100" pageHeight="1600" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="title" parent="1" style="text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontStyle=1;fontSize=22;fontColor=#1F4E79;" value="UC-14 — Quản lý lộ trình mẫu" vertex="1">
          <mxGeometry height="45" width="820" x="140" y="15" as="geometry" />
        </mxCell>
        <mxCell id="start" parent="1" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#16A34A;strokeColor=#15803D;fontColor=#FFFFFF;fontStyle=1;" value="●" vertex="1">
          <mxGeometry height="42" width="180" x="460" y="85" as="geometry" />
        </mxCell>
        <mxCell id="open" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Mở quản lý lộ trình mẫu" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="160" as="geometry" />
        </mxCell>
        <mxCell id="list" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Hiển thị danh sách lộ trình" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="250" as="geometry" />
        </mxCell>
        <mxCell id="mode" parent="1" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FEF3C7;strokeColor=#D97706;fontStyle=1;fontSize=13;" value="Tạo mới hay chỉnh sửa?" vertex="1">
          <mxGeometry height="85" width="240" x="430" y="340" as="geometry" />
        </mxCell>
        <mxCell id="create" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Chọn tạo mới" vertex="1">
          <mxGeometry height="65" width="300" x="145" y="455" as="geometry" />
        </mxCell>
        <mxCell id="existing" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Chọn lộ trình cần chỉnh sửa" vertex="1">
          <mxGeometry height="65" width="300" x="655" y="455" as="geometry" />
        </mxCell>
        <mxCell id="edit" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Nhập thông tin và chọn thứ tự POI" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="545" as="geometry" />
        </mxCell>
        <mxCell id="valid" parent="1" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FEF3C7;strokeColor=#D97706;fontStyle=1;fontSize=13;" value="Dữ liệu hợp lệ?" vertex="1">
          <mxGeometry height="85" width="240" x="430" y="635" as="geometry" />
        </mxCell>
        <mxCell id="save" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#DCFCE7;strokeColor=#16A34A;fontSize=13;" value="Lưu lộ trình mẫu" vertex="1">
          <mxGeometry height="62" width="310" x="165" y="750" as="geometry" />
        </mxCell>
        <mxCell id="result" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#DCFCE7;strokeColor=#16A34A;fontSize=13;" value="Thông báo kết quả và cập nhật danh sách" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="840" as="geometry" />
        </mxCell>
        <mxCell id="fix" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#FFF1F2;strokeColor=#E11D48;fontSize=12;" value="Báo lỗi, yêu cầu chỉnh sửa" vertex="1">
          <mxGeometry height="68" width="280" x="655" y="750" as="geometry" />
        </mxCell>
        <mxCell id="end" parent="1" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#1F2937;strokeColor=#111827;fontColor=#FFFFFF;fontStyle=1;" value="◎" vertex="1">
          <mxGeometry height="42" width="180" x="460" y="930" as="geometry" />
        </mxCell>
        <mxCell id="e0" edge="1" parent="1" source="start" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="open" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e1" edge="1" parent="1" source="open" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="list" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e2" edge="1" parent="1" source="list" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="mode" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e3" edge="1" parent="1" source="mode" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="create" value="Tạo mới">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e4" edge="1" parent="1" source="mode" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="existing" value="Chỉnh sửa">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e5" edge="1" parent="1" source="create" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="edit" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e6" edge="1" parent="1" source="existing" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="edit" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e7" edge="1" parent="1" source="edit" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="valid" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e8" edge="1" parent="1" source="valid" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="save" value="Có">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e9" edge="1" parent="1" source="valid" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="fix" value="Không">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e10" edge="1" parent="1" source="save" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="result" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e11" edge="1" parent="1" source="fix" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="edit" value="Sửa lại">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e12" edge="1" parent="1" source="result" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="end" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
  <diagram name="Activity UC-18 Giám sát sức khỏe và sử dụng" id="NOE8hwTOseEcmIU5AxeK">
    <mxGraphModel grid="1" page="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" pageScale="1" pageWidth="1100" pageHeight="1600" math="0" shadow="0">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        <mxCell id="title" parent="1" style="text;html=1;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontStyle=1;fontSize=22;fontColor=#1F4E79;" value="UC-18 — Giám sát sức khỏe và sử dụng" vertex="1">
          <mxGeometry height="45" width="820" x="140" y="15" as="geometry" />
        </mxCell>
        <mxCell id="start" parent="1" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#16A34A;strokeColor=#15803D;fontColor=#FFFFFF;fontStyle=1;" value="●" vertex="1">
          <mxGeometry height="42" width="180" x="460" y="85" as="geometry" />
        </mxCell>
        <mxCell id="open" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Mở trang giám sát" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="160" as="geometry" />
        </mxCell>
        <mxCell id="auth" parent="1" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FEF3C7;strokeColor=#D97706;fontStyle=1;fontSize=13;" value="ADMIN có quyền truy cập?" vertex="1">
          <mxGeometry height="85" width="240" x="430" y="250" as="geometry" />
        </mxCell>
        <mxCell id="fetch" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Truy xuất chỉ số sức khỏe và sử dụng" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="365" as="geometry" />
        </mxCell>
        <mxCell id="dataok" parent="1" style="rhombus;whiteSpace=wrap;html=1;fillColor=#FEF3C7;strokeColor=#D97706;fontStyle=1;fontSize=13;" value="Các nguồn dữ liệu sẵn sàng?" vertex="1">
          <mxGeometry height="85" width="240" x="430" y="455" as="geometry" />
        </mxCell>
        <mxCell id="aggregate" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#EFF6FF;strokeColor=#64748B;fontSize=13;" value="Tổng hợp phiên, thanh toán, audio, chatbot, ngôn ngữ" vertex="1">
          <mxGeometry height="62" width="400" x="145" y="570" as="geometry" />
        </mxCell>
        <mxCell id="partial" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#FFF1F2;strokeColor=#E11D48;fontSize=12;" value="Đánh dấu phần dữ liệu không khả dụng" vertex="1">
          <mxGeometry height="68" width="300" x="655" y="570" as="geometry" />
        </mxCell>
        <mxCell id="show" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#DCFCE7;strokeColor=#16A34A;fontSize=13;" value="Hiển thị dashboard" vertex="1">
          <mxGeometry height="62" width="400" x="350" y="665" as="geometry" />
        </mxCell>
        <mxCell id="deny" parent="1" style="rounded=1;whiteSpace=wrap;html=1;fillColor=#FFF1F2;strokeColor=#E11D48;fontSize=12;" value="Từ chối truy cập" vertex="1">
          <mxGeometry height="68" width="280" x="720" y="365" as="geometry" />
        </mxCell>
        <mxCell id="end" parent="1" style="ellipse;whiteSpace=wrap;html=1;aspect=fixed;fillColor=#1F2937;strokeColor=#111827;fontColor=#FFFFFF;fontStyle=1;" value="◎" vertex="1">
          <mxGeometry height="42" width="180" x="460" y="755" as="geometry" />
        </mxCell>
        <mxCell id="e0" edge="1" parent="1" source="start" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="open" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e1" edge="1" parent="1" source="open" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="auth" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e2" edge="1" parent="1" source="auth" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="fetch" value="Có">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e3" edge="1" parent="1" source="auth" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="deny" value="Không">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e4" edge="1" parent="1" source="fetch" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="dataok" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e5" edge="1" parent="1" source="dataok" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="aggregate" value="Có">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e6" edge="1" parent="1" source="dataok" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="partial" value="Không">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e7" edge="1" parent="1" source="aggregate" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="show" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e8" edge="1" parent="1" source="partial" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="show" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e9" edge="1" parent="1" source="show" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="end" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
        <mxCell id="e10" edge="1" parent="1" source="deny" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;endArrow=block;endFill=1;fontSize=11;fontStyle=1;strokeColor=#475569;" target="end" value="">
          <mxGeometry relative="1" as="geometry" />
        </mxCell>
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
