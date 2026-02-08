import { NextRequest, NextResponse } from 'next/server'

// Mapping status from 17Track to our display text
function getStatusText(status: string | number): string {
    // 17Track status: 0:Not Found, 10:In Transit, 20:Expired, 30:Ready to Pick, 35:Undelivered, 40:Delivered, 50:Exception
    const statusMap: Record<string, string> = {
        '0': 'Không tìm thấy',
        '10': 'Đang vận chuyển',
        '20': 'Hết hạn',
        '30': 'Sẵn sàng giao',
        '35': 'Giao không thành công',
        '40': 'Đã giao hàng',
        '50': 'Có vấn đề (Exception)',
        'Not Found': 'Không tìm thấy',
        'In Transit': 'Đang vận chuyển',
        'Expired': 'Hết hạn',
        'Ready to Pick': 'Sẵn sàng giao',
        'Undelivered': 'Giao không thành công',
        'Delivered': 'Đã giao hàng',
        'Exception': 'Có vấn đề',
    }
    return statusMap[String(status)] || 'Đang cập nhật'
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const trackingNumber = searchParams.get('trackingNumber')
        const apiKey = process.env.TRACK17_API_KEY

        if (!trackingNumber) {
            return NextResponse.json({ error: 'Tracking number is required' }, { status: 400 })
        }

        if (!apiKey) {
            console.error('SERVER ERROR: Missing TRACK17_API_KEY in .env')
            return NextResponse.json({ error: 'System configuration error - Missing API Key' }, { status: 500 })
        }

        // --- METHOD 1: Direct SPX VN API (Fastest) ---
        // Try alternate endpoints used by SPX web
        const spxEndpoints = [
            `https://spx.vn/api/v2/fleet_order/tracking/search?sls_tracking_number=${trackingNumber}`,
            `https://spx.vn/api/v2/tracker/list_tracks_info?sls_tracking_numbers=${trackingNumber}`
        ]

        for (const endpoint of spxEndpoints) {
            try {
                console.log(`[SPX Direct] Trying endpoint: ${endpoint}`)
                const spxResponse = await fetch(endpoint, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Referer': 'https://spx.vn/',
                        'Accept': 'application/json, text/plain, */*',
                        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                })

                if (spxResponse.ok) {
                    const contentType = spxResponse.headers.get('content-type')
                    if (contentType && contentType.includes('application/json')) {
                        const spxData = await spxResponse.json()
                        console.log(`[SPX Direct] Response from ${endpoint}:`, JSON.stringify(spxData))

                        // Check valid data
                        if (spxData && spxData.message === 'success' && spxData.data) {
                            let info = spxData.data

                            // list_tracks_info returns a map/array
                            if (spxData.data[trackingNumber]) {
                                info = spxData.data[trackingNumber]
                            }

                            const trackingList = info.tracking_list || []

                            if (trackingList.length > 0) {
                                const events = trackingList.map((evt: any) => ({
                                    timestamp: new Date(evt.timestamp * 1000).toISOString(),
                                    status: evt.status || '',
                                    description: evt.description || evt.message || '',
                                    location: evt.location || ''
                                }))

                                return NextResponse.json({
                                    trackingNumber,
                                    carrier: 'Shopee Express (SPX VN)',
                                    status: info.current_status || 'active',
                                    statusText: info.current_status || 'Đang vận chuyển',
                                    events: events
                                })
                            }
                        }
                    }
                }
            } catch (spxError) {
                console.error(`[SPX Direct] Error with ${endpoint}:`, spxError)
            }
        }

        // --- METHOD 2: 17Track API (Fallback) ---
        console.log('[Fallback] Switching to 17Track API...')

        // Let 17Track AUTO-DETECT carrier (pass 0 or exclude carrier field)
        // Hardcoding 190356 seemed to fail (mapped to Madrooex causing NotFound)

        try {
            const regRes = await fetch('https://api.17track.net/track/v2.2/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', '17token': apiKey },
                body: JSON.stringify([{ number: trackingNumber }]) // Auto-detect
            })
            const regData = await regRes.json()
            console.log(`[17Track] Register ${trackingNumber}:`, JSON.stringify(regData))
        } catch (regError) {
            console.warn('[17Track] Registration warning:', regError)
        }

        // 2. Get tracking info
        const response = await fetch('https://api.17track.net/track/v2.2/gettrackinfo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', '17token': apiKey },
            body: JSON.stringify([{ number: trackingNumber }]), // Auto-detect
            cache: 'no-store'
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error(`[17Track] API Error ${response.status}:`, errorText)
            throw new Error(`17Track API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        console.log(`[17Track] GetInfo Response for ${trackingNumber}:`, JSON.stringify(data))

        // Check accepted list
        if (data.code === 0 && data.data && data.data.accepted && data.data.accepted.length > 0) {
            const trackItem = data.data.accepted[0]
            const trackInfo = trackItem.track

            // Log detailed structure for debugging
            console.log(`[17Track] Track Item structure:`, JSON.stringify(trackItem))

            if (!trackInfo) {
                // Accepted but no track info yet (maybe just registered)
                return NextResponse.json({
                    trackingNumber,
                    carrier: 'SPX',
                    status: 'pending',
                    statusText: 'Đang lấy dữ liệu từ 17Track...',
                    events: []
                })
            }

            // Normalize events
            const rawEvents = trackInfo.z1 || []

            // If z1 is empty but z0 (latest event) exists
            if (rawEvents.length === 0 && trackInfo.z0) {
                rawEvents.push(trackInfo.z0)
            }

            const events = rawEvents.map((evt: any) => ({
                timestamp: evt.a, // time
                status: '',
                description: evt.z, // description
                location: evt.c + (evt.d ? `, ${evt.d}` : '') // location
            }))

            return NextResponse.json({
                trackingNumber,
                carrier: 'Shopee Express (SPX)',
                status: String(trackInfo.e),
                statusText: getStatusText(trackInfo.e),
                events: events
            })
        }

        // Check rejected list
        if (data.data && data.data.rejected && data.data.rejected.length > 0) {
            const rejected = data.data.rejected[0]
            console.log('[17Track] Rejected:', rejected)
            return NextResponse.json({
                trackingNumber,
                carrier: 'SPX',
                status: 'rejected',
                statusText: 'Không tìm thấy hoặc Lỗi',
                note: `Lỗi từ 17Track: ${rejected.error?.message || 'Unknown reason'}`,
                events: []
            })
        }

        // Fallback for empty data
        console.log('[17Track] No data returned')
        return NextResponse.json({
            trackingNumber,
            carrier: 'SPX',
            status: 'unknown',
            statusText: 'Đang chờ cập nhật từ 17Track...',
            events: []
        })

    } catch (e: any) {
        console.error('Tracking API Error:', e)
        return NextResponse.json({
            error: 'Failed to fetch tracking info',
            details: e.message
        }, { status: 500 })
    }
}
